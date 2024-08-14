import recursiveFree from 'recursive-free'
import Logger from '../../logger.mjs'
import type { VNode } from '../../vdom/vnode.mjs'
import * as Hydrate from '../../vdom/hydrate.mjs'
import type { FapleImpl } from './../fapleImpl.mjs'
import { KEY_ATTRIBUTE_HYDRATE_IGNORE } from '../../constant.mjs'
export function initializeVNode( vnode: VNode, hydrate: Node | false, fapleImpl: FapleImpl) {
    const rec = recursiveFree<{ vnode: VNode, hydrate: Node | false }, HTMLElement | Text>(function* (opt) {

        const vnode = opt.vnode
        const hydrate = opt.hydrate
        let mis = false
        if (vnode.type === 'TEXT') {
            let node: Text | null = null
            if (hydrate === false) {
                node = document.createTextNode(vnode.text)
            }
            else {
                if (Hydrate.isTextNode(hydrate)) {
                    node = hydrate
                    node.nodeValue = vnode.text
                }
                else {
                    mis = true
                    node = document.createTextNode(vnode.text)
                }
            }
            if (mis) {
                Logger.warn('Hydrate mismatched text', vnode, hydrate, node)
            }
            vnode.node = node
            return node
        }
        if (vnode.type === 'CONSTRUCTOR') {
            const ins = fapleImpl.instantiateComponent(vnode.constructor)
            ins.properties ??= {}
            Object.assign(ins.properties, vnode.properties)
            fapleImpl.initializeComponent(ins, opt.hydrate && Hydrate.isElementNode(opt.hydrate) ? opt.hydrate : undefined)
            vnode.instance = ins
            return ins.$$slot.vNodeEl?.node!
        }
        if (vnode.type === 'ELEMENT' || vnode.type === 'INSTANCE_ROOT') {
            const vnodeElement = vnode.type === 'ELEMENT' ? vnode : vnode.elVNode
            let el: HTMLElement | null = null
            if (hydrate === false || !Hydrate.isElementNode(hydrate)) {
                if (hydrate !== false) {
                    mis = true
                }
                el = document.createElement(vnodeElement.tag)


            } else {
                if (hydrate.tagName.toLowerCase() === vnodeElement.tag.toLowerCase()) {
                    if (fapleImpl.getComponentByElement(hydrate)) {
                        el = document.createElement(vnodeElement.tag)
                    } else {
                        el = hydrate
                    }
                } else {
                    mis = true
                    el = document.createElement(vnodeElement.tag)
                }
            }
            if (mis) {

                Logger.warn('Hydrate mismatched', vnode, hydrate, el)
            }
            if (vnodeElement.attributes) {
                for (const key in vnodeElement.attributes) {
                    const attr = vnodeElement.attributes[key]
                    el.setAttribute(key, attr)
                }
            }
            if (vnodeElement.listeners) {

                for (const key in vnodeElement.listeners) {

                    const event = vnodeElement.listeners[key]

                    el.addEventListener(key, event as any)
                }
            }
            if (typeof vnodeElement.classes === 'string') {
                el.className = vnodeElement.classes
            }
            if (typeof vnodeElement.styles === 'string') {
                el.setAttribute('style', vnodeElement.styles)
            }
            if (vnodeElement.rawHtml !== undefined) {
                el.innerHTML = vnodeElement.rawHtml
            }
            else if (vnodeElement.children) {
                let hydrateNodes: (Node | typeof Hydrate.HydrateHolder)[] | null = null

                // let mismatched = false

                for (let i = 0, hydi = 0; i < vnodeElement.children.length; i++, hydi++) {


                    const child: VNode = vnodeElement.children[i]
                    let hydrateOpt: typeof Hydrate.HydrateHolder | typeof hydrate = false
                    if (hydrate) {
                        if (mis) {
                            hydrateOpt = false
                        } else {
                            hydrateNodes ??= Array.from(el.childNodes.values())

                            hydrateOpt = hydrateNodes[hydi] ?? false

                            if (child.type === 'INSTANCE_ROOT') {
                                throw ''
                            }

                            while (hydrateOpt && hydrateOpt !== Hydrate.HydrateHolder && Hydrate.isElementNode(hydrateOpt) && hydrateOpt.hasAttribute(KEY_ATTRIBUTE_HYDRATE_IGNORE)) {
                                hydrateOpt.remove()
                                hydi++
                                hydrateOpt = hydrateNodes[hydi] ?? false
                            }

                            if (hydrateOpt && hydrateOpt !== Hydrate.HydrateHolder && child.type !== 'TEXT') {
                                while (hydrateOpt && hydrateOpt !== Hydrate.HydrateHolder && Hydrate.isTextNode(hydrateOpt)) {

                                    hydrateOpt.remove()
                                    hydi++
                                    hydrateOpt = hydrateNodes[hydi] ?? false

                                }
                            }
                            if (hydrateOpt === Hydrate.HydrateHolder) {
                                hydrateOpt = false
                            }
                        }
                    }

                    const childEl: HTMLElement | Text = yield { vnode: child, hydrate: hydrateOpt, fapleImpl }
                    if (hydrate && mis === false && childEl === hydrateOpt) {
                        //hydrated
                    }
                    else {
                        if (hydrateOpt) {
                            if (childEl.parentNode === hydrateOpt.parentNode) {
                                const ind = hydrateNodes?.findIndex(ite => ite === childEl) ?? false
                                if (ind === false || ind === -1) {
                                    throw 'hydrate e 1'
                                }
                                hydrateNodes![ind] = Hydrate.HydrateHolder


                            }
                            el.replaceChild(childEl, hydrateOpt)
                        }
                        else {
                            el.appendChild(childEl)
                        }
                    }
                }
            }
            vnodeElement.node = el
            if (vnode.type === 'ELEMENT' && vnode.ref) {
                vnode.ref.value = el
            }
            if (vnode.type === 'INSTANCE_ROOT') {
                // registerElementId(vnodeElement.node,vnode.instance.)
                // elementIDs.set(vnodeElement.node, vnode.instance.$$slot.id)
            }

            return el
        }
        if (vnode.type === 'INSTANCE_REFERENCE') {
            if (!vnode.vNodeInstanceRoot.elVNode.node) {
                Logger.error('Referenced instance not inited')
                throw ''
            }
            if (vnode.vNodeInstanceRoot.previousVNodeInstanceReference) {
                vnode.vNodeInstanceRoot.previousVNodeInstanceReference.isFake = true
            }

            return vnode.vNodeInstanceRoot.elVNode.node
        }


        Logger.error('VNode not supported', vnode)
        throw ''
    })
    return rec({vnode,hydrate})
}
