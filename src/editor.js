import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"

import { schema } from "prosemirror-schema-basic"
import { baseKeymap } from "prosemirror-commands"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { addListNodes } from "prosemirror-schema-list"

import { buildInputRules, autoLinkPlugin } from "./inputrules.js"
import { buildKeymap } from "./keymap.js"

import { menuPlugin } from "./menuPlugin.js"

const Editor = parameters => {

	const el = parameters.element

	// Markup changes to accomodate text editor
	el.innerHTML = `<div class="texteditor__content" style="display:none!important;">${el.innerHTML}</div>` // Wrap/hide existing content
	const content = el.querySelector('.texteditor__content')
	const editor = document.createElement('div')
	editor.classList.add('texteditor')
	el.append(editor)

	// Create instance of menu plugin
	const menu = new menuPlugin(parameters.menu)

	const mySchema = new Schema({
		nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
		marks: schema.spec.marks,
	})

	// Define state
	const state = EditorState.create({
		doc: DOMParser.fromSchema(mySchema).parse(content),
		plugins: [
			menu,
			buildInputRules(mySchema),
			autoLinkPlugin(mySchema),
			history(),
			keymap(buildKeymap(mySchema)),
			keymap(baseKeymap),

			// keymap({
			// 	"Mod-z": undo,
			// 	"Mod-y": redo,
			// }),

			// keymap({
			// 	"Shift-Enter": (state, dispatch) =>
			// 		dispatch(
			// 			state.tr
			// 			.replaceSelectionWith(mySchema.nodes.hard_break.create())
			// 			.scrollIntoView()
			// 		),
			// 	"Mod-b": toggleMark(mySchema.marks.strong),
			// 	"Mod-i": toggleMark(mySchema.marks.em),
			// 	"Mod-z": undo,
			// 	"Mod-y": redo,
			// }),
		],
	})

	// Define view
	let view = new EditorView(editor, {
		state,
		dispatchTransaction(transaction) {

			// Update editor state
			let previousState = view.state.doc
			let newState = view.state.apply(transaction)
			view.updateState(newState)

			// Save content
			if (!previousState.eq(view.state.doc)) {

				const html = view.dom.innerHTML
				const id = el.dataset.id ?? el.id ?? "About 350"
		
				// Send data to callback function
				parameters.change({
					id: id,
					html: html,
				})

			}
		},
		handlePaste(view, event) {
			const text = event.clipboardData?.getData('text/plain')
			if (text && /^(https?:\/\/|www\.)\S+$/i.test(text.trim())) {
				const url = text.trim()
				const href = url.startsWith('http') ? url : `http://${url}`
				const mark = view.state.schema.marks.link.create({ href })
				const node = view.state.schema.text(url, [mark])
				view.dispatch(view.state.tr.replaceSelectionWith(node, false))
				return true
			}
			return false
		},
		handleDOMEvents: {
			focus: (view, event) => {
				if (parameters.focus) parameters.focus()
			},
			blur: (view, event) => {
				if (parameters.blur) parameters.blur()
			},
		}, 
	})

}

// Unused
const toHTML = string => {
	const div = document.createElement('div')
	div.appendChild(string)
	return div.innerHTML
}

export default Editor
