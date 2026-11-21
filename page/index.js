import { createWidget, widget, align, text_style, prop, createKeyboard, deleteKeyboard, inputType, keyboard } from '@zos/ui'
import { px } from '@zos/utils'

Page({
  state: { previewText: '', previewWidget: null },
  build() {
    const enabled = keyboard && keyboard.isEnabled ? keyboard.isEnabled() : false
    const selected = keyboard && keyboard.isSelected ? keyboard.isSelected() : false

    let statusMsg = '1. Open Settings and enable Max Keyboard\n2. Tap the globe icon while typing to select it'
    if (enabled && !selected) statusMsg = 'Max Keyboard is enabled ✓\nTap the globe icon while typing to switch to it'
    else if (enabled && selected) statusMsg = 'Max Keyboard is active and ready ✓'

    createWidget(widget.TEXT, { x: px(20), y: px(28), w: px(392), h: px(50), text: 'Max Keyboard', text_size: px(32), color: 0xffffff, align_h: align.CENTER_H, align_v: align.CENTER_V })
    createWidget(widget.TEXT, { x: px(20), y: px(86), w: px(392), h: px(92), text: statusMsg, text_size: px(21), color: 0xb0b0b5, align_h: align.CENTER_H, align_v: align.CENTER_V, text_style: text_style.WRAP })
    createWidget(widget.BUTTON, { x: px(46), y: px(192), w: px(340), h: px(68), radius: px(16), normal_color: 0x1e88e5, press_color: 0x1565c0, text: 'Keyboard Settings', text_size: px(24), color: 0xffffff, click_func: () => { if (keyboard && keyboard.gotoSettings) keyboard.gotoSettings() } })

    this.state.previewWidget = createWidget(widget.TEXT, { x: px(24), y: px(280), w: px(384), h: px(90), text: 'Tap below to test typing', text_size: px(24), color: 0x4fc3f7, align_h: align.CENTER_H, align_v: align.CENTER_V, text_style: text_style.WRAP })
    createWidget(widget.BUTTON, {
      x: px(46), y: px(386), w: px(340), h: px(68), radius: px(16), normal_color: 0x2e7d32, press_color: 0x1b5e20, text: 'Test Keyboard', text_size: px(24), color: 0xffffff,
      click_func: () => {
        createKeyboard({ inputType: inputType.CHAR, text: '', onComplete: (_, result) => { const raw = result.data || ''; this.state.previewText = raw; this.state.previewWidget.setProperty(prop.TEXT, raw || 'Tap below to test typing'); deleteKeyboard(); }, onCancel: () => deleteKeyboard() })
      }
    })
  }
})
