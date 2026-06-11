import {inputRules, wrappingInputRule, textblockTypeInputRule,
	smartQuotes, emDash, ellipsis, InputRule} from "prosemirror-inputrules"
import {Plugin, TextSelection} from "prosemirror-state"
import {isInTable} from "prosemirror-tables"
import {markdownToTable} from "./pluginUtils.js"

// : (NodeType) → InputRule
// Given a blockquote node type, returns an input rule that turns `"> "`
// at the start of a textblock into a blockquote.
export function blockQuoteRule(nodeType) {
	return wrappingInputRule(/^\s*>\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a number
// followed by a dot at the start of a textblock into an ordered list.
export function orderedListRule(nodeType) {
	return wrappingInputRule(/^(\d+)\.\s$/, nodeType, match => ({order: +match[1]}),
					(match, node) => node.childCount + node.attrs.order == +match[1])
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a bullet
// (dash, plush, or asterisk) at the start of a textblock into a
// bullet list.
export function bulletListRule(nodeType) {
	return wrappingInputRule(/^\s*([-+*])\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
export function codeBlockRule(nodeType) {
	return textblockTypeInputRule(/^```$/, nodeType)
}

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
export function headingRule(nodeType, maxLevel) {
	return textblockTypeInputRule(new RegExp("^(#{1," + maxLevel + "})\\s$"),
							nodeType, match => ({level: match[1].length}))
}

// : (Schema) → InputRule
// Typing a markdown table separator line (e.g. "|---|---|") directly below a
// "| header | header |" line turns both lines into a table with one empty
// body row, cursor in its first cell. Accepts em-dashes because the emDash
// smart-punctuation rule converts "--" while the separator is being typed.
export function tableRule(schema) {
	return new InputRule(/^\|?(?:\s*:?[-—]+:?\s*\|)+$/, (state, match, start, end) => {
		if (isInTable(state)) return null
		const $start = state.doc.resolve(start)
		if ($start.depth !== 1 || $start.parent.type !== schema.nodes.paragraph) return null
		const index = $start.index(0)
		if (index === 0) return null
		const prev = state.doc.child(index - 1)
		if (prev.type !== schema.nodes.paragraph || !prev.textContent.includes('|')) return null

		const separator = match[0].replace(/—/g, '---')
		const headerTable = markdownToTable(schema, prev.textContent + '\n' + separator)
		if (!headerTable) return null

		const header = headerTable.child(0)

		// Only fire once the separator is fully typed: one |---| segment per
		// header column. Firing on the first segment would steal keystrokes
		// the user still intends to type.
		const sepCount = separator.replace(/^\|/, '').replace(/\|$/, '').split('|').length
		if (sepCount !== header.childCount) return null

		// Append an empty body row to type into
		const cells = []
		for (let i = 0; i < header.childCount; i++) {
			cells.push(schema.nodes.table_cell.create(null, schema.nodes.paragraph.create()))
		}
		const table = schema.nodes.table.create(null, [
			header,
			schema.nodes.table_row.create(null, cells),
		])

		const from = $start.before(1) - prev.nodeSize
		const tr = state.tr.replaceRangeWith(from, end, table)
		tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1 + header.nodeSize)))
		return tr
	})
}

// Plugin that auto-links typed URLs after a space is pressed.
// Uses appendTransaction so the space is inserted normally first.
export function autoLinkPlugin(schema) {
	const markType = schema.marks.link
	const urlRegex = /(?:^|\s)((?:https?:\/\/|www\.)\S+)\s$/

	return new Plugin({
		appendTransaction(transactions, oldState, newState) {
			if (!transactions.some(tr => tr.docChanged)) return null

			const {$from} = newState.selection
			const textBefore = $from.parent.textBetween(0, $from.parentOffset)
			const match = urlRegex.exec(textBefore)
			if (!match) return null

			const url = match[1]
			const urlStart = $from.start() + match.index + match[0].indexOf(url)
			const urlEnd = urlStart + url.length

			if (newState.doc.rangeHasMark(urlStart, urlEnd, markType)) return null

			const href = url.startsWith('http') ? url : `http://${url}`
			const mark = markType.create({href})
			return newState.tr.addMark(urlStart, urlEnd, mark)
		}
	})
}

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export function buildInputRules(schema) {
	let rules = smartQuotes.concat(ellipsis, emDash), type
		if (type = schema.nodes.blockquote) rules.push(blockQuoteRule(type))
		if (type = schema.nodes.ordered_list) rules.push(orderedListRule(type))
		if (type = schema.nodes.bullet_list) rules.push(bulletListRule(type))
		if (type = schema.nodes.code_block) rules.push(codeBlockRule(type))
		if (type = schema.nodes.heading) rules.push(headingRule(type, 6))
		if (type = schema.nodes.table) rules.push(tableRule(schema))
	return inputRules({rules})
}
