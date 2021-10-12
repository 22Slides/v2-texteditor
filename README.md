## 22Slides v2 Text Editor

22Slides v2's Prosemirror-based text editor.

#### Tests

- [One instance](https://bryanbuchanan.github.io/texteditor/test/index.html)
- [Multiple instances on one page](https://bryanbuchanan.github.io/texteditor/test/multiple.html)
- [Multiple instances inside iframe](https://bryanbuchanan.github.io/texteditor/test/frame.html)

#### Usage

```js
import Editor from "../dist/editor.js"

Editor({
    element: document.querySelector('.text'),
    menu: [
        { type: "strong", title: "Bold", icon: '<strong>B</strong>' },
        { type: "em", title: "Italic", icon: '<em>i</em>' },
        { type: "link", title: "Create a link", icon: 'link' },
        { type: "divider", icon: '' },
        { type: "h2", title: "Large Heading", icon: 'h2' },
        { type: "h3", title: "Small Heading", icon: 'h3' },
        { type: "divider", icon: '' },
        { type: "ul", title: "Bullet List", icon: 'ul' },
        { type: "ol", title: "Numbered List", icon: 'ol' },
        { type: "blockquote", title: "Quote", icon: 'quote' },
        { type: "hr", title: "Horizontal Line", icon: 'hr' },
    ],
    change: (data) => {
        console.log(data)
    }
})
```

#### Contributors

- [Jakub Markiewicz](https://github.com/JakubMarkiewicz)
- [Bryan Buchanan](https://github.com/bryanbuchanan)
