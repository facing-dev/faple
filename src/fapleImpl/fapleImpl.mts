import { Component, type ComponentConstructor } from "../component/component.mjs"
import recursiveFree from 'recursive-free'
import type { VNode, VNodeInstanceRoot } from '../vdom/vnode.mjs'
import { Scheduler } from '../scheduler.mjs'
import { VoidElementTags } from '../vdom/def.mjs'
import { KEY_ATTRIBUTE_HYDRATE_IGNORE, KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC, KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC_HTML } from '../constant.mjs'
import { initializeVNode } from './vnodeManipulations/initialize.mjs'
import { updateVNode } from './vnodeManipulations/update.mjs'
import { releaseVNodeInstanveRoot } from "./vnodeManipulations/release.mjs"
export class FapleImpl {
    components: Map<string, Component> = new Map
    elementIDs: WeakMap<HTMLElement, string> = new WeakMap
    getComponentByElement(el: HTMLElement) {
        const id = this.elementIDs.get(el)
        if (id === undefined) {
            return
        }
        const comp = this.components.get(id)
        if (comp?.$$slot.vNodeEl?.node !== el) {
            return
        }
        return comp
    }




    scopeEl: HTMLElement
    constructor(scopeEl?: HTMLElement) {

        this.scopeEl = scopeEl ?? document.body
        let els = this.scopeEl.querySelectorAll(`[${KEY_ATTRIBUTE_HYDRATE_IGNORE}][${KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC}]`)
        els.forEach(e => e.innerHTML = '')
        els = this.scopeEl.querySelectorAll(`[${KEY_ATTRIBUTE_HYDRATE_IGNORE}][${KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC_HTML}]`)
        els.forEach(e => e.innerHTML = '')
        this.scheduler = new Scheduler()
    }
    scheduler: Scheduler
    private mountedPromises: Promise<void>[] = []
    waitComponentsMounted(cb: Function) {
        this.mountedPromises = []
        this.scheduler.scheduleWaitMounted(async () => {
            await Promise.all(this.mountedPromises)
            cb()
        })
    }
    instantiateComponent<COMP extends Component>(cons: ComponentConstructor<COMP>): COMP {
        return new cons(this)
    }

    initializeComponent<T extends Component>(comp: T, reuseEl?: HTMLElement): T {
        const id = comp.$$slot.id
        if (this.components.has(id)) {
            throw 'component has been inited'
        }
        this.components.set(id, comp)
        comp.$$slot.beforeMount()

        comp.$$slot.hEffect.effect.run()

        const el = initializeVNode(comp.$$slot.vNode!, reuseEl ?? false, this)
        if (!(el instanceof HTMLElement)) {
            throw '1'
        }
        this.scheduler.scheduleMounted(() => {
            const ret = comp.mounted()
            if (ret) {
                this.mountedPromises ??= []
                this.mountedPromises?.push(ret)
            }
            comp.$$slot.afterMounted()
        })
        return comp
    }
    updateComponent(comp: Component) {
        const slot = comp.$$slot
        slot.hEffect.effect.run()
        if (!slot.vNodeElOld) {
            throw 'vNodeOld is undefined'
        }
        updateVNode(slot.vNodeElOld, slot.vNodeEl!, this)
    }
    /**
     * not recursive
     */
    releaseComponent(comp: Component, deleteEl = false) {
        releaseVNodeInstanveRoot(comp.$$slot.vNode!, deleteEl, this)
    }

    renderString(component: Component, opt?: {
        style?: boolean,
        class?: boolean,
        ignoreAttributes?: string[]
        vnodeModifier?: (vnode: VNodeInstanceRoot) => void
    }) {
        opt ??= {}
        opt.style ??= true
        opt.class ??= true
        const vNodeTree2String = recursiveFree<VNode, string>(function* (vnode: VNode) {

            if (vnode.type === 'TEXT') {
                return vnode.text
            }
            if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
                const vnodeElement = vnode.type === 'ELEMENT' ? vnode : vnode.elVNode
                let str = `<${vnodeElement.tag}`
                if (vnodeElement.classes && opt?.class) {
                    str += ` class="${vnodeElement.classes}"`
                }
                if (vnodeElement.styles && opt?.style) {
                    str += ` style="${vnodeElement.styles}"`
                }
                if (vnodeElement.attributes) {
                    str += ' ' + Object.keys(vnodeElement.attributes).map(key => {
                        const val = vnodeElement.attributes![key]
                        if ((opt?.ignoreAttributes?.findIndex(ite => ite === key) ?? -1) >= 0) {
                            return ''
                        }
                        if (typeof val === 'string') {
                            if (val !== '') {
                                return `${key}="${val}"`
                            } else {
                                return key
                            }
                        } else {
                            return ''
                        }
                    }).join(' ')
                }
                if (VoidElementTags.has(vnodeElement.tag)) {
                    str += '/>'
                } else {
                    str += '>'
                    if (vnodeElement.rawHtml) {
                        str += vnodeElement.rawHtml
                    }
                    if (!vnodeElement.attributes || !(KEY_ATTRIBUTE_HYDRATE_IGNORE in vnodeElement.attributes) || ((KEY_ATTRIBUTE_HYDRATE_IGNORE in vnodeElement.attributes) && KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC in vnodeElement.attributes)) {
                        if (vnodeElement.children) {
                            for (const child of vnodeElement.children) {
                                if (child.type === 'INSTANCE_REFERENCE') {
                                    str += yield child.vNodeInstanceRoot
                                }
                                else {
                                    str += yield child
                                }
                            }
                        }
                    }
                    if (vnodeElement.attributes && KEY_ATTRIBUTE_HYDRATE_IGNORE in vnodeElement.attributes && KEY_ATTRIBUTE_HYDRATE_IGNORE_STATIC_HTML in vnodeElement.attributes) {
                        str += vnodeElement.node?.innerHTML ?? ''
                    }
                    str += `</${vnodeElement.tag}>`
                }
                return str
            }
            throw ''
        })

        return new Promise<string>((res) => {
            this.waitComponentsMounted(() => {
                const vNode = comp.$$slot.vNode!
                opt?.vnodeModifier?.(vNode)
                res(vNodeTree2String(vNode))
            })
            const comp = this.initializeComponent(component)
        })

    }
}