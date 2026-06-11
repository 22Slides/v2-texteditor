import Editor from "../dist/editor.js"

window.editorViews = []

for (const text of document.querySelectorAll('.text')) {

	window.editorViews.push(Editor({
		element: text,
		menu: [
			{ type: "strong", title: "Bold", icon: '<i class="fa-solid fa-bold"></i>' },
			{ type: "em", title: "Italic", icon: '<i class="fa-solid fa-italic"></i>' },
			{ type: "link", title: "Create a link", icon: '<i class="fa-solid fa-link"></i>' },
			{ type: "divider", icon: '' },
			{ type: "h1", title: "Heading 1", icon: '<i class="fa-solid fa-h1"></i>' },
			{ type: "h2", title: "Heading 2", icon: '<i class="fa-solid fa-h2"></i>' },
			{ type: "h3", title: "Heading 3", icon: '<i class="fa-solid fa-h3"></i>' },
			// { type: "divider", icon: '' },
			// { type: "ul", title: "Bullet List", icon: '<i class="fal fa-list"></i>' },
			// { type: "ol", title: "Numbered List", icon: '<i class="fal fa-list-ol"></i>' },
			{ type: "blockquote", title: "Quote", icon: '<i class="fa-solid fa-quotes"></i>' },
			// { type: "hr", title: "Horizontal Line", icon: 'hr' }
		],
		change: data => {
			console.log(data)
		},
		focus: () => {
			console.log('focus!')
		},
		blur: () => {
			console.log('blurrrrr')
		}

	}))

}
