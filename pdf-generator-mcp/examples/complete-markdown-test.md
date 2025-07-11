# Complete Markdown Formatting Test

This document tests all markdown features supported by the PDF generator.

## Text Formatting

Basic text with **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and `inline code`.

==This text is highlighted== for emphasis.

## Headings Within Content

### Third Level Heading
#### Fourth Level Heading
##### Fifth Level Heading
###### Sixth Level Heading

## Lists

### Unordered List
- First item
- Second item
  - Nested item 1
  - Nested item 2
    - Deep nested item
- Third item with `code`

### Ordered List
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### Task Lists
- [x] Completed task
- [ ] Uncompleted task
- [x] Another completed task
- [ ] Task with **bold** text

## Links and Images

Visit [GitHub](https://github.com) for more information.

![Placeholder Image](https://via.placeholder.com/150)

## Blockquotes

> This is a standard blockquote.
> It can span multiple lines.

### Callout Boxes

> [!NOTE]
> This is an informational note with **bold** and *italic* text.

> [!TIP]
> Best practice tip with `inline code`.

> [!WARNING]
> Warning message with ==highlighted text==.

> [!DANGER]
> Critical error message.

## Code Blocks

```javascript
// JavaScript example with syntax highlighting
const pdfGenerator = {
  format: 'A4',
  theme: 'light',
  fontStyle: 'modern'
};

function generatePDF(options) {
  return new Promise((resolve, reject) => {
    // Generate PDF logic
    resolve('PDF generated');
  });
}
```

```python
# Python example
def generate_pdf(content: str, options: dict) -> bytes:
    """Generate a PDF from markdown content."""
    pdf = PDFGenerator(**options)
    return pdf.render(content)
```

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| **Bold** | ✅ Supported | Works everywhere |
| *Italic* | ✅ Supported | Including tables |
| `Code` | ✅ Supported | Monospace font |
| ==Highlight== | ✅ Supported | Yellow background |
| ~~Strike~~ | ✅ Supported | Line through |

## Text Alignment

Regular left-aligned paragraph.

->This text is centered<-

>>This text is right-aligned

## Horizontal Rules

Above the line

---

Below the line

## Line Breaks and Spacing

This is a paragraph with normal spacing.

This is another paragraph. Notice the spacing between paragraphs.

This line has a
manual line break (two spaces at end of line).

## Mixed Content Example

Here's a complex example combining multiple features:

> [!TIP]
> **Pro tip:** When creating PDFs, you can:
> - Use ==highlighting== for important text
> - Add `inline code` for technical terms
> - Create nested lists:
>   - [x] With task items
>   - [ ] That can be checked
> - Include *formatted* text

### Technical Documentation Example

1. **Setup Instructions**
   - Install dependencies: `npm install`
   - Configure settings
   - [x] Update config file
   - [ ] Set environment variables

2. **Code Implementation**
   ```bash
   # Run the build
   npm run build
   ```

3. **Testing**
   - Run unit tests
   - Check PDF output
   - Verify formatting

## Special Characters

- Ampersand: &
- Less than: <
- Greater than: >
- Quote: "
- Apostrophe: '
- Copyright: ©
- Trademark: ™
- Registered: ®
- Euro: €
- Pound: £

## Emoji Support (Unicode)

Common emojis: ✅ ❌ ⚠️ 📄 🎉 🚀 💡 🔧 📝 ⭐

## Long Content Test

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

---

->**End of Markdown Test Document**<-
