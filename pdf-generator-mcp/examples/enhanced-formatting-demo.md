# Enhanced PDF Formatting Demo

This document demonstrates the improved formatting capabilities of the PDF generator.

## Typography Enhancements

Here are examples of the new text formatting options:

- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- ***Bold and italic*** combined
- ~~Strikethrough text~~ for deletions
- Regular text with `inline code`

## Lists and Nested Lists

### Unordered Lists
- First level bullet point
  - Second level with circle bullet
    - Third level with square bullet
  - Another second level item
- Back to first level

### Ordered Lists
1. First item
2. Second item
   1. Nested numbered item
   2. Another nested item
3. Third item

## Blockquotes and Callout Boxes

> This is a regular blockquote. It can contain multiple paragraphs and other formatting.
>
> It has a distinct visual style with a left border and italic text.

### Callout Boxes

> [!NOTE]
> This is an informational note callout box with a blue theme.

> [!TIP]
> This is a success/tip callout box with a green theme. Great for best practices!

> [!WARNING]
> This is a warning callout box with a yellow theme. Use for cautions.

> [!DANGER]
> This is an error/danger callout box with a red theme. Use for critical warnings.

## Text Alignment

Regular left-aligned text (default).

->This text is centered using the arrow syntax<-

>>This text is right-aligned using the double arrow syntax

## Dividers and Spacing

Text above the divider.

---

Text below the divider. The divider provides visual separation between sections.

## Tables with Enhanced Styling

| Feature | Status | Notes |
|---------|--------|-------|
| **Bold** support | ✅ Implemented | Works in all contexts |
| *Italic* support | ✅ Implemented | Including in tables |
| Lists | ✅ Implemented | With proper nesting |
| Callout boxes | ✅ Implemented | Multiple types available |

## Code Blocks with Syntax Highlighting

```javascript
// Example JavaScript code with syntax highlighting
const enhancedPDF = {
  features: ['bold', 'italic', 'lists', 'callouts'],
  improvements: {
    typography: true,
    layout: true,
    visuals: true
  }
};

console.log('PDF formatting enhanced!');
```

```python
# Python example
def generate_pdf(content, options):
    """Generate a beautifully formatted PDF"""
    return pdf_generator.create(
        content=content,
        theme=options.get('theme', 'light'),
        formatting='enhanced'
    )
```

## Combined Formatting Examples

Here's a complex example combining multiple formatting features:

> [!TIP]
> **Pro tip:** You can combine *multiple* formatting options including `code`, ***bold italic***, and even ~~strikethrough~~ within callout boxes!

### Shopping List Example
- **Groceries**
  - *Fruits*
    - Apples
    - Bananas
  - *Vegetables*
    - Carrots
    - ~~Lettuce~~ (already have)
- **Hardware**
  - Screws (size `M4x20`)
  - Paint (*blue* or *green*)

->**Thank you for using the enhanced PDF generator!**<-
