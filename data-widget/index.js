import { createWidget, deleteWidget, deleteKeyboard, widget, align, text_style, prop, event, keyboard } from '@zos/ui'
import { px } from '@zos/utils'

const LAYOUTS = {
  ar_main: [
    ['ص', 'ق', 'ف', 'ع', 'ه', 'خ', 'ح', 'ج'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م'],
    ['د', 'ك', 'ط', 'ر', 'ة', 'و', 'ز', 'ى']
  ],
  ar_sym: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['ض', 'ث', 'غ', 'ظ', 'ذ', 'أ', 'إ', 'آ', 'لا'],
    ['ئ', 'ء', 'ؤ', '؟', '!', '،', '.', '-']
  ],
  en_main: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ],
  en_sym: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['@', '#', '$', '_', '&', '-', '+', '(', ')', '/'],
    ['*', '"', "'", ':', ';', '!', '?', '.']
  ],
  emoji: [
    ['😀', '😂', '😍', '🥰', '😊', '😭', '😎', '🤔'],
    ['❤️', '🔥', '👍', '🙏', '👏', '👌', '💯', '✨'],
    ['🌹', '🎉', '🤝', '💪', '🤲', '😢', '😡', '🌙']
  ]
}

// Conservative pixel width per character at text_size 34 so 3 lines NEVER overflow 312px
function getCharAdvance(ch) {
  if (ch === ' ') return 11
  if ("iljtfr1.,'!|:;()".indexOf(ch) !== -1) return 12
  if ('WM@#%&'.indexOf(ch) !== -1) return 27
  if ('wm'.indexOf(ch) !== -1) return 25
  if (ch >= 'A' && ch <= 'Z') return 23
  if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) return 19
  if (/[\u0600-\u06FF]/.test(ch)) return 20
  // Emojis and wide symbols
  if (ch.codePointAt(0) > 0x2000) return 34
  return 21
}

function wrapIntoExactLines(text, maxWidthPx) {
  if (!text) return ['']
  const lines = []
  let currentLine = ''
  let currentWidth = 0

  for (const ch of Array.from(text)) {
    if (ch === '\n') {
      lines.push(currentLine)
      currentLine = ''
      currentWidth = 0
      continue
    }
    const w = getCharAdvance(ch)
    if (currentWidth + w > maxWidthPx && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = ch
      currentWidth = w
    } else {
      currentLine += ch
      currentWidth += w
    }
  }
  lines.push(currentLine)
  return lines
}

DataWidget({
  state: {
    lang: 'en',
    layer: 'main',
    shiftState: 'off',
    buffer: '',
    hasModified: false,
    scrollOffset: 0, // 0 = bottom (latest 3 lines), >0 = scrolled up by N lines
    dragStartY: null,
    previewTextWidget: null,
    widgets: []
  },

  build() { this.syncInitialContext(); this.renderAll() },
  onResume() { this.syncInitialContext(); this.renderAll() },
  onPause() {
    this.state.buffer = ''
    this.state.hasModified = false
    this.state.shiftState = 'off'
    this.state.scrollOffset = 0
  },

  syncInitialContext() {
    this.state.buffer = ''
    this.state.hasModified = false
    this.state.scrollOffset = 0
    try {
      if (keyboard && typeof keyboard.getTextContext === 'function') {
        const ctx = keyboard.getTextContext()
        if (typeof ctx === 'string') this.state.buffer = ctx
        else if (ctx && typeof ctx.beforeCursor === 'string') this.state.buffer = ctx.beforeCursor
      }
    } catch (e) {}
  },

  clearWidgets() {
    this.state.widgets.forEach((w) => deleteWidget(w))
    this.state.widgets = []
    this.state.previewTextWidget = null
  },

  addWidget(type, props) {
    const w = createWidget(type, props)
    this.state.widgets.push(w)
    return w
  },

  isRtlMode() { return this.state.lang === 'ar' },
  isEnglishMain() { return this.state.lang === 'en' && this.state.layer === 'main' },

  getActiveRows() {
    if (this.state.layer === 'emoji') return LAYOUTS.emoji
    const key = `${this.state.lang}_${this.state.layer}`
    const baseRows = LAYOUTS[key] || LAYOUTS.en_main
    if (this.isEnglishMain() && this.state.shiftState !== 'off') {
      return baseRows.map((row) => row.map((ch) => ch.toUpperCase()))
    }
    return baseRows
  },

  getVisibleThreeLines() {
    const hasText = this.state.buffer.length > 0
    if (!hasText) {
      return this.isRtlMode() ? 'اكتب هنا...' : 'Type here...'
    }
    // Wrap to 290px inside the 312px box so Zepp OS never wraps a line unexpectedly
    const allLines = wrapIntoExactLines(this.state.buffer, 290)
    const maxOffset = Math.max(0, allLines.length - 3)
    if (this.state.scrollOffset > maxOffset) this.state.scrollOffset = maxOffset
    if (this.state.scrollOffset < 0) this.state.scrollOffset = 0

    const endIdx = allLines.length - this.state.scrollOffset
    const startIdx = Math.max(0, endIdx - 3)
    return allLines.slice(startIdx, endIdx).join('\n')
  },

  updatePreview() {
    if (!this.state.previewTextWidget) return
    const hasText = this.state.buffer.length > 0
    const displayStr = this.getVisibleThreeLines()

    this.state.previewTextWidget.setProperty(prop.MORE, {
      text: displayStr,
      color: hasText ? 0xffffff : 0x7a7a85,
      align_h: this.isRtlMode() ? align.RIGHT : align.LEFT
    })
  },

  commitChar(char) {
    if (keyboard && typeof keyboard.inputText === 'function') keyboard.inputText(char)
    this.state.buffer += char
    this.state.hasModified = true
    this.state.scrollOffset = 0 // Snap to latest typed text immediately

    if (this.isEnglishMain() && this.state.shiftState === 'once') {
      this.state.shiftState = 'off'
      this.renderAll()
      return
    }
    this.updatePreview()
  },

  handleShiftToggle() {
    if (this.state.shiftState === 'off') this.state.shiftState = 'once'
    else if (this.state.shiftState === 'once') this.state.shiftState = 'caps'
    else this.state.shiftState = 'off'
    this.renderAll()
  },

  handleBackspace() {
    if (keyboard && typeof keyboard.backspace === 'function') keyboard.backspace()
    else if (keyboard && typeof keyboard.sendFnKey === 'function') keyboard.sendFnKey(keyboard.BACKSPACE)

    if (this.state.buffer.length > 0) {
      const chars = Array.from(this.state.buffer)
      chars.pop()
      this.state.buffer = chars.join('')
      this.state.hasModified = true
      this.state.scrollOffset = 0
      this.updatePreview()
    }
  },

  closeKeyboard() {
    try { if (typeof deleteKeyboard === 'function') deleteKeyboard() } catch (e) {}
    try {
      if (keyboard) {
        if (typeof keyboard.cancel === 'function') { keyboard.cancel(); return }
        if (typeof keyboard.hide === 'function') { keyboard.hide(); return }
        if (typeof keyboard.sendFnKey === 'function') {
          if (keyboard.CANCEL !== undefined) { keyboard.sendFnKey(keyboard.CANCEL); return }
          if (keyboard.CLOSE !== undefined) { keyboard.sendFnKey(keyboard.CLOSE); return }
          keyboard.sendFnKey(keyboard.ENTER)
        }
      }
    } catch (e) {}
  },

  handleEnter() {
    if (!this.state.hasModified && this.state.buffer.length === 0) { this.closeKeyboard(); return }
    if (keyboard && typeof keyboard.sendFnKey === 'function') keyboard.sendFnKey(keyboard.ENTER)
    this.state.buffer = ''
    this.state.hasModified = false
    this.state.scrollOffset = 0
  },

  handleLanguageSwitch() {
    this.state.lang = this.state.lang === 'en' ? 'ar' : 'en'
    this.state.layer = 'main'
    this.state.shiftState = 'off'
    this.renderAll()
  },

  renderAll() {
    this.clearWidgets()

    const bgColor = 0x000000
    const pressFlash = 0x333333

    // 1. FULLSCREEN BLACKOUT
    this.addWidget(widget.FILL_RECT, { x: px(0), y: px(0), w: px(432), h: px(514), color: bgColor })

    // 2. LARGE 3-LINE TEXT AREA (y: 24 .. 170) — No cursor, zero-lag instant line wrapping + touch scroll
    const hasText = this.state.buffer.length > 0
    const displayStr = this.getVisibleThreeLines()

    this.state.previewTextWidget = this.addWidget(widget.TEXT, {
      x: px(24), y: px(24), w: px(312), h: px(146),
      text: displayStr,
      text_size: px(34),
      color: hasText ? 0xffffff : 0x7a7a85,
      align_h: this.isRtlMode() ? align.RIGHT : align.LEFT,
      align_v: align.BOTTOM,
      text_style: text_style.NONE
    })

    // Slide up/down gesture listener over the text area to browse earlier lines
    this.state.previewTextWidget.addEventListener(event.CLICK_DOWN, (info) => {
      this.state.dragStartY = info.y
    })
    this.state.previewTextWidget.addEventListener(event.MOVE, (info) => {
      if (this.state.dragStartY === null) return
      const dy = info.y - this.state.dragStartY
      if (Math.abs(dy) >= 28) {
        // Dragging finger down reveals earlier lines above; dragging up returns toward newest lines
        const step = dy > 0 ? 1 : -1
        this.state.scrollOffset += step
        this.state.dragStartY = info.y
        this.updatePreview()
      }
    })
    this.state.previewTextWidget.addEventListener(event.CLICK_UP, () => {
      this.state.dragStartY = null
    })

    // Backspace Button (Top Right)
    this.addWidget(widget.BUTTON, {
      x: px(344), y: px(50), w: px(80), h: px(80), radius: px(16),
      normal_src: 'backspace.png', press_src: 'backspace.png',
      click_func: () => this.handleBackspace()
    })

    // 3. KEYBOARD AREA (y: 170 .. 428)
    const startY = 170
    const rowHeight = 86

    const rows = this.getActiveRows()

    rows.forEach((rowKeys, rowIndex) => {
      const y = startY + (rowIndex * rowHeight)
      const isThirdRow = rowIndex === 2
      const showShift = isThirdRow && this.isEnglishMain()

      const extraSlots = showShift ? 1 : 0
      const totalSlots = rowKeys.length + extraSlots

      const keyW = Math.floor(432 / totalSlots)
      const startX = Math.floor((432 - (keyW * totalSlots)) / 2)
      let currentX = startX

      // Shift Key on Row 3
      if (showShift) {
        let shiftColor = 0x777777
        if (this.state.shiftState === 'once') shiftColor = 0xffffff
        if (this.state.shiftState === 'caps') shiftColor = 0x1e88e5

        this.addWidget(widget.BUTTON, {
          x: px(currentX), y: px(y), w: px(keyW), h: px(rowHeight), radius: px(12),
          normal_color: bgColor, press_color: pressFlash,
          text: '↑', text_size: px(34), color: shiftColor,
          click_func: () => this.handleShiftToggle()
        })
        currentX += keyW
      }

      // Main Letter Keys
      rowKeys.forEach((char) => {
        this.addWidget(widget.BUTTON, {
          x: px(currentX), y: px(y), w: px(keyW), h: px(rowHeight), radius: px(12),
          normal_color: bgColor, press_color: pressFlash,
          text: char, text_size: px(this.state.layer === 'emoji' ? 34 : 40), color: 0xffffff,
          click_func: () => this.commitChar(char)
        })
        currentX += keyW
      })
    })

    // 4. BOTTOM ROW (Row 4, y: 428)
    // 24px safe padding on left & right for rounded screen corners:
    // [1/2] 64 | [Globe] 64 | [Emoji] 64 | [Space] 128 | [✓] 64
    const bottomY = startY + (3 * rowHeight)

    this.addWidget(widget.BUTTON, {
      x: px(24), y: px(bottomY), w: px(64), h: px(rowHeight), radius: px(12),
      normal_color: bgColor, press_color: pressFlash,
      text: this.state.layer === 'sym' ? '2/2' : '1/2', text_size: px(24), color: 0xffffff,
      click_func: () => { this.state.layer = this.state.layer === 'sym' ? 'main' : 'sym'; this.renderAll() }
    })

    // Pure white custom Globe icon
    this.addWidget(widget.BUTTON, {
      x: px(88), y: px(bottomY), w: px(64), h: px(rowHeight), radius: px(12),
      normal_src: 'globe.png', press_src: 'globe.png',
      click_func: () => this.handleLanguageSwitch()
    })

    // Pure white custom Emoji icon (turns sky-blue only while emoji panel is open)
    const emojiIcon = this.state.layer === 'emoji' ? 'emoji_active.png' : 'emoji.png'
    this.addWidget(widget.BUTTON, {
      x: px(152), y: px(bottomY), w: px(64), h: px(rowHeight), radius: px(12),
      normal_src: emojiIcon, press_src: emojiIcon,
      click_func: () => { this.state.layer = this.state.layer === 'emoji' ? 'main' : 'emoji'; this.renderAll() }
    })

    // Spacebar
    this.addWidget(widget.BUTTON, {
      x: px(216), y: px(bottomY), w: px(128), h: px(rowHeight), radius: px(12),
      normal_src: 'space.png', press_src: 'space.png',
      click_func: () => this.commitChar(' ')
    })

    // Checkmark (Enter / Close)
    this.addWidget(widget.BUTTON, {
      x: px(344), y: px(bottomY), w: px(64), h: px(rowHeight), radius: px(12),
      normal_color: bgColor, press_color: pressFlash,
      text: '✓', text_size: px(36), color: 0xffffff,
      click_func: () => this.handleEnter()
    })
  }
})
