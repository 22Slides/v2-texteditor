import {
	wrapIn, setBlockType, chainCommands, toggleMark, exitCode,
	joinUp, joinDown, lift, selectParentNode
} from "prosemirror-commands"
import { wrapInList, splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list"
import { undo, redo } from "prosemirror-history"
import { undoInputRule } from "prosemirror-inputrules"
import { goToNextCell, CellSelection, deleteTable, deleteRow, deleteColumn, addRowAfter, isInTable } from "prosemirror-tables"
import { GapCursor } from "prosemirror-gapcursor"
import { TextSelection } from "prosemirror-state"

// Arrow up/down from a table's edge row places a gap cursor before/after the
// table when there's nothing else there to move into (e.g. the table is the
// first/last node in the document). Without this, prosemirror-tables eats the
// keypress by snapping the cursor to the cell boundary, trapping it.
const escapeTableEdge = dir => (state, dispatch, view) => {
	const sel = state.selection
	if (!sel.empty || !(sel instanceof TextSelection)) return false
	if (view && !view.endOfTextblock(dir < 0 ? "up" : "down")) return false
	const { $head } = sel
	for (let d = $head.depth; d > 0; d--) {
		if ($head.node(d).type.spec.tableRole !== "row") continue
		const tableDepth = d - 1
		const table = $head.node(tableDepth)
		// Only escape from the first row going up / last row going down,
		// and only from the cell's first/last block, so in-table navigation
		// still belongs to prosemirror-tables
		const rowIndex = $head.index(tableDepth)
		const blockIndex = $head.index(d + 1)
		const cell = $head.node(d + 1)
		if (dir < 0 && (rowIndex > 0 || blockIndex > 0)) return false
		if (dir > 0 && (rowIndex < table.childCount - 1 || blockIndex < cell.childCount - 1)) return false
		const $gap = state.doc.resolve(dir < 0 ? $head.before(tableDepth) : $head.after(tableDepth))
		if (!GapCursor.valid($gap)) return false
		if (dispatch) dispatch(state.tr.setSelection(new GapCursor($gap)).scrollIntoView())
		return true
	}
	return false
}

// When the cell selection covers entire rows or columns, delete that table
// section instead of just clearing the cells' contents (the prosemirror-tables
// default). Whole table selected → delete the table.
const deleteFullySelectedCells = (state, dispatch) => {
	const sel = state.selection
	if (!(sel instanceof CellSelection)) return false
	const fullRows = sel.isRowSelection()
	const fullCols = sel.isColSelection()
	if (fullRows && fullCols) return deleteTable(state, dispatch)
	if (fullRows) return deleteRow(state, dispatch)
	if (fullCols) return deleteColumn(state, dispatch)
	return false
}

const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

// :: (Schema, ?Object) → Object
// Inspect the given schema looking for marks and nodes from the
// basic schema, and if found, add key bindings related to them.
// This will add:
//
// * **Mod-b** for toggling [strong](#schema-basic.StrongMark)
// * **Mod-i** for toggling [emphasis](#schema-basic.EmMark)
// * **Mod-`** for toggling [code font](#schema-basic.CodeMark)
// * **Ctrl-Shift-0** for making the current textblock a paragraph
// * **Ctrl-Shift-1** to **Ctrl-Shift-Digit6** for making the current
//   textblock a heading of the corresponding level
// * **Ctrl-Shift-Backslash** to make the current textblock a code block
// * **Ctrl-Shift-8** to wrap the selection in an ordered list
// * **Ctrl-Shift-9** to wrap the selection in a bullet list
// * **Ctrl->** to wrap the selection in a block quote
// * **Enter** to split a non-empty textblock in a list item while at
//   the same time splitting the list item
// * **Mod-Enter** to insert a hard break
// * **Mod-_** to insert a horizontal rule
// * **Backspace** to undo an input rule
// * **Alt-ArrowUp** to `joinUp`
// * **Alt-ArrowDown** to `joinDown`
// * **Mod-BracketLeft** to `lift`
// * **Escape** to `selectParentNode`
//
// You can suppress or map these bindings by passing a `mapKeys`
// argument, which maps key names (say `"Mod-B"` to either `false`, to
// remove the binding, or a new key name string.
export function buildKeymap(schema, mapKeys) {
	let keys = {}, type
	function bind(key, cmd) {
		if (mapKeys) {
			let mapped = mapKeys[key]
			if (mapped === false) return
			if (mapped) key = mapped
		}
		keys[key] = cmd
	}


	bind("Mod-z", undo)
	bind("Shift-Mod-z", redo)
	bind("Backspace", undoInputRule)
	if (!mac) bind("Mod-y", redo)

	bind("Alt-ArrowUp", joinUp)
	bind("Alt-ArrowDown", joinDown)
	bind("Mod-BracketLeft", lift)
	bind("Escape", selectParentNode)

	if (type = schema.marks.strong) {
		bind("Mod-b", toggleMark(type))
		bind("Mod-B", toggleMark(type))
	}
	if (type = schema.marks.em) {
		bind("Mod-i", toggleMark(type))
		bind("Mod-I", toggleMark(type))
	}
	// if (type = schema.marks.code)
	// 	bind("Mod-`", toggleMark(type))

	// if (type = schema.nodes.bullet_list)
	// 	bind("Shift-Ctrl-8", wrapInList(type))
	// if (type = schema.nodes.ordered_list)
	// 	bind("Shift-Ctrl-9", wrapInList(type))
	// if (type = schema.nodes.blockquote)
	// 	bind("Ctrl->", wrapIn(type))
	if (type = schema.nodes.hard_break) {
		let br = type, cmd = chainCommands(exitCode, (state, dispatch) => {
			dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView())
			return true
		})
		bind("Mod-Enter", cmd)
		bind("Shift-Enter", cmd)
		if (mac) bind("Ctrl-Enter", cmd)
	}
	// Tab in the table's last cell appends a new row and moves into it
	const appendRowOnTab = (state, dispatch, view) => {
		if (!isInTable(state)) return false
		if (dispatch) {
			addRowAfter(state, dispatch)
			goToNextCell(1)(view.state, view.dispatch)
		}
		return true
	}

	if (type = schema.nodes.table) {
		bind("Tab", chainCommands(goToNextCell(1), appendRowOnTab))
		bind("Shift-Tab", goToNextCell(-1))
		bind("Backspace", chainCommands(deleteFullySelectedCells, undoInputRule))
		bind("Delete", deleteFullySelectedCells)
		bind("ArrowUp", escapeTableEdge(-1))
		bind("ArrowDown", escapeTableEdge(1))
	}
	if (type = schema.nodes.list_item) {
		bind("Enter", splitListItem(type))
		// bind("Mod-[", liftListItem(type))
		// bind("Mod-]", sinkListItem(type))
	}
	// if (type = schema.nodes.paragraph)
	// 	bind("Shift-Ctrl-0", setBlockType(type))
	// if (type = schema.nodes.code_block)
	// 	bind("Shift-Ctrl-\\", setBlockType(type))
	// if (type = schema.nodes.heading)
	// 	for (let i = 1; i <= 6; i++) bind("Shift-Ctrl-" + i, setBlockType(type, { level: i }))
	// if (type = schema.nodes.horizontal_rule) {
	// 	let hr = type
	// 	bind("Mod-_", (state, dispatch) => {
	// 		dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView())
	// 		return true
	// 	})
	// }

	return keys
}