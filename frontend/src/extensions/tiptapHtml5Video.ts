import { Node, mergeAttributes } from '@tiptap/core'

/** 支持在介绍中插入 HTML5 视频（演示环境上传后写入占位 MP4 地址） */
export const Html5Video = Node.create({
  name: 'html5Video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
    }
  },
  parseHTML() {
    return [{ tag: 'video' }]
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        style: 'max-width:100%;border-radius:8px',
      }),
    ]
  },
})
