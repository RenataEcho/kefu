<template>
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <div v-if="editor" class="rte-toolbar">
      <n-button-group size="small">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled || !editor.can().chain().focus().toggleBold().run()" @click="editor.chain().focus().toggleBold().run()">
              <strong>B</strong>
            </n-button>
          </template>
          粗体
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled || !editor.can().chain().focus().toggleItalic().run()" @click="editor.chain().focus().toggleItalic().run()">
              <em>I</em>
            </n-button>
          </template>
          斜体
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled || !editor.can().chain().focus().toggleUnderline().run()" @click="editor.chain().focus().toggleUnderline().run()">
              <span class="ul">U</span>
            </n-button>
          </template>
          下划线
        </n-tooltip>
      </n-button-group>
      <n-button-group size="small">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</n-button>
          </template>
          二级标题
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="editor.chain().focus().toggleBulletList().run()">• 列表</n-button>
          </template>
          无序列表
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="editor.chain().focus().toggleOrderedList().run()">1. 列表</n-button>
          </template>
          有序列表
        </n-tooltip>
      </n-button-group>
      <n-button-group size="small">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="addLink">链接</n-button>
          </template>
          插入超链接
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="pickImage">图片</n-button>
          </template>
          上传图片（演示环境写入 base64）
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="addYoutube">YouTube</n-button>
          </template>
          嵌入 YouTube 视频
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary :disabled="disabled" @click="pickVideo">视频文件</n-button>
          </template>
          上传本地视频（演示环境插入示例 MP4 地址）
        </n-tooltip>
      </n-button-group>
    </div>
    <editor-content :editor="editor" class="rte-content" />
    <input ref="imgRef" type="file" accept="image/*" class="rte-file-input" @change="onImage" />
    <input ref="vidRef" type="file" accept="video/*" class="rte-file-input" @change="onVideoFile" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { NButton, NButtonGroup, NTooltip, useMessage } from 'naive-ui'
import { Html5Video } from '@/extensions/tiptapHtml5Video'

const MOCK_MP4 =
  'https://www.w3.org/2010/05/video/mediafiles/360_240_stereo.mp4'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    minHeight?: number
  }>(),
  {
    placeholder: '编辑介绍正文，支持排版、图片、YouTube 与视频…',
    disabled: false,
    minHeight: 200,
  },
)

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

const message = useMessage()
const imgRef = useTemplateRef<HTMLInputElement>('imgRef')
const vidRef = useTemplateRef<HTMLInputElement>('vidRef')

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
    Image.configure({ inline: false, allowBase64: true }),
    Youtube.configure({ width: 480, height: 270, nocookie: true }),
    Html5Video,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-root',
      style: `min-height:${props.minHeight}px`,
    },
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

watch(
  () => props.modelValue,
  (html) => {
    const ed = editor.value
    if (!ed || ed.isDestroyed) return
    const next = html && html.trim() ? html : '<p></p>'
    if (next === ed.getHTML()) return
    ed.commands.setContent(next, false)
  },
)

watch(
  () => props.disabled,
  (d) => {
    editor.value?.setEditable(!d)
  },
)

function addLink() {
  const ed = editor.value
  if (!ed) return
  const prev = window.prompt('请输入链接 URL（需含 http/https）', 'https://')
  if (!prev?.trim()) return
  let url = prev.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function pickImage() {
  imgRef.value?.click()
}

function onImage(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  const ed = editor.value
  if (!file || !ed) {
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const src = reader.result as string
    ed.chain().focus().setImage({ src }).run()
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function addYoutube() {
  const ed = editor.value
  if (!ed) return
  const url = window.prompt('粘贴 YouTube 视频页链接（支持 watch / youtu.be）', '')
  if (!url?.trim()) return
  ed.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
}

function pickVideo() {
  vidRef.value?.click()
}

function onVideoFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  const ed = editor.value
  if (!file || !ed) {
    input.value = ''
    return
  }
  message.info(`演示环境：已用示例 MP4 代替「${file.name}」`)
  ed.chain().focus().insertContent({ type: 'html5Video', attrs: { src: MOCK_MP4 } }).run()
  input.value = ''
}

onBeforeUnmount(() => {
  const ed = editor.value
  if (ed && !ed.isDestroyed) ed.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--glass-card-border, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-md, 10px);
  background: var(--glass-card-bg, rgba(20, 22, 28, 0.5));
  overflow: hidden;
}

.rich-text-editor.is-disabled {
  opacity: 0.65;
  pointer-events: none;
}

.rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--glass-card-border, rgba(255, 255, 255, 0.08));
  background: rgba(0, 0, 0, 0.15);
}

.rte-content :deep(.tiptap-root) {
  padding: 12px 14px;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.rte-content :deep(.tiptap-root p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted);
  pointer-events: none;
  height: 0;
}

.rte-content :deep(.tiptap-root img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.rte-content :deep(.tiptap-root iframe) {
  max-width: 100%;
  border-radius: 8px;
}

.rte-content :deep(.tiptap-root ul),
.rte-content :deep(.tiptap-root ol) {
  padding-left: 1.25rem;
  margin: 0.5em 0;
}

.ul {
  text-decoration: underline;
}

.rte-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
