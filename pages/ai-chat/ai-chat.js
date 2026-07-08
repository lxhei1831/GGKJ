const {
  sendChatMessage,
} = require('../../services/chatAssistant')
const {
  normalizeChosenFiles,
  normalizeChosenMedia,
  uploadChatAttachments,
} = require('../../services/chatAttachments')

const welcomeMessage = {
  id: 'msg-welcome',
  anchorId: 'msgwelcome',
  role: 'assistant',
  content: '你好，我是港港跨境 AI 助手。你可以把平台通知、申诉材料、商品图或证据文件发给我，我们一起梳理下一步。',
  attachments: [],
}

Page({
  data: {
    messages: [welcomeMessage],
    inputText: '',
    pendingAttachments: [],
    sending: false,
    scrollIntoView: 'msgwelcome',
  },
  bindInput(event) {
    this.setData({
      inputText: event.detail.value,
    })
  },
  openAttachmentMenu() {
    if (this.data.sending) return

    wx.showActionSheet({
      itemList: ['上传图片', '上传文件'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseImage()
          return
        }
        if (res.tapIndex === 1) {
          this.chooseFile()
        }
      },
    })
  },
  chooseImage() {
    const onSuccess = (res) => {
      this.addPendingAttachments(normalizeChosenMedia(res))
    }

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 6,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: onSuccess,
      })
      return
    }

    wx.chooseImage({
      count: 6,
      success: (res) => {
        const tempFiles = (res.tempFilePaths || []).map((tempFilePath) => ({ tempFilePath }))
        onSuccess({ tempFiles })
      },
    })
  },
  chooseFile() {
    wx.chooseMessageFile({
      count: 6,
      type: 'file',
      success: (res) => {
        this.addPendingAttachments(normalizeChosenFiles(res))
      },
    })
  },
  addPendingAttachments(attachments) {
    if (!attachments.length) return

    this.setData({
      pendingAttachments: this.data.pendingAttachments.concat(attachments),
    })
  },
  removeAttachment(event) {
    const index = Number(event.currentTarget.dataset.index)
    const next = this.data.pendingAttachments.filter((item, itemIndex) => itemIndex !== index)

    this.setData({
      pendingAttachments: next,
    })
  },
  sendMessage() {
    if (this.data.sending) return

    const text = String(this.data.inputText || '').trim()
    const attachments = this.data.pendingAttachments

    if (!text && !attachments.length) {
      wx.showToast({
        title: '请输入消息或添加附件',
        icon: 'none',
      })
      return
    }

    const previousMessages = this.buildConversationContext()
    const userMessage = this.createMessage('user', text, attachments)
    const nextMessages = this.data.messages.concat(userMessage)

    this.setData({
      messages: nextMessages,
      inputText: '',
      pendingAttachments: [],
      sending: true,
      scrollIntoView: userMessage.anchorId,
    })

    uploadChatAttachments(attachments)
      .then((uploadedAttachments) => sendChatMessage({
        text,
        messages: previousMessages,
        attachments: uploadedAttachments,
      }))
      .then((reply) => {
        const assistantMessage = this.createMessage('assistant', reply.reply, [])
        this.setData({
          messages: this.data.messages.concat(assistantMessage),
          sending: false,
          scrollIntoView: assistantMessage.anchorId,
        })
      })
      .catch(() => {
        const assistantMessage = this.createMessage(
          'assistant',
          'AI 回复暂时失败，请稍后再试，或先补充平台通知截图和关键证据。'
        )
        this.setData({
          messages: this.data.messages.concat(assistantMessage),
          sending: false,
          scrollIntoView: assistantMessage.anchorId,
        })
      })
  },
  buildConversationContext() {
    return this.data.messages
      .filter((message) => message.id !== welcomeMessage.id)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }))
  },
  createMessage(role, content, attachments) {
    const id = createMessageId()

    return {
      id,
      anchorId: id.replace(/-/g, ''),
      role,
      content: String(content || '').trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
    }
  },
})

function createMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
