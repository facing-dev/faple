import recursiveFree from "recursive-free";
import { VNode, VNodeElement } from "../../vdom/vnode";
import { FapleImpl } from "./../fapleImpl";
import { couldReuse } from "./couldReuse";
import { initializeVNode } from "./initialize";
import { releaseVNode, releaseVNodeInstanveRoot } from "./release";
export function updateVNode(oldVNode: VNode, newVNode: VNode, fapleImpl: FapleImpl) {
    const rec = recursiveFree<[VNode, VNode], void>(function* (args) {
        const [oldVNode, newVNode] = args
        if (!couldReuse(oldVNode, newVNode)) {
            return
        }

        if ((oldVNode.type === 'ELEMENT' && newVNode.type === 'ELEMENT') ||
            (oldVNode.type === 'INSTANCE_ROOT' && newVNode.type === 'INSTANCE_ROOT')) {
            let node: HTMLElement | undefined = undefined;
            let newVNodeElement: VNodeElement | null = null
            let oldVNodeElement: VNodeElement | null = null
            if (oldVNode.type === 'ELEMENT' && newVNode.type === 'ELEMENT') {
                node = newVNode.node = oldVNode.node!
                newVNodeElement = newVNode
                oldVNodeElement = oldVNode
            }
            if (oldVNode.type === 'INSTANCE_ROOT' && newVNode.type === 'INSTANCE_ROOT') {
                node = newVNode.elVNode.node = oldVNode.elVNode.node!
                newVNodeElement = newVNode.elVNode
                oldVNodeElement = oldVNode.elVNode
            }
            if (!node || !newVNodeElement || !oldVNodeElement) {
                throw ''
            }
            // const node = newVNode.node = oldVNode.node!
            {
                //rawHtml
                if (newVNodeElement.rawHtml !== oldVNodeElement.rawHtml) {

                    node.innerHTML = newVNodeElement.rawHtml ?? ''

                }
            }
            {

                //attr
                if (newVNodeElement.attributes) {
                    for (const key in newVNodeElement.attributes) {
                        if (oldVNodeElement.attributes && (key in oldVNodeElement.attributes)) {
                            if (newVNodeElement.attributes[key] !== oldVNodeElement.attributes[key]) {
                                node.setAttribute(key, newVNodeElement.attributes[key])
                            } else {
                                continue
                            }
                        } else {
                            node.setAttribute(key, newVNodeElement.attributes[key])
                        }
                    }
                }
                if (oldVNodeElement.attributes) {
                    for (const key in oldVNodeElement.attributes) {
                        if (!newVNodeElement.attributes || !(key in newVNodeElement.attributes)) {
                            node.removeAttribute(key)
                        }
                    }
                }

            }

            {
                //listener
                if (newVNodeElement.listeners) {
                    for (const key in newVNodeElement.listeners) {
                        if (oldVNodeElement.listeners && (key in oldVNodeElement.listeners)) {
                            if (newVNodeElement.listeners[key] !== oldVNodeElement.listeners[key]) {
                                node.removeEventListener(key, oldVNodeElement.listeners[key] as any)
                                node.addEventListener(key, newVNodeElement.listeners[key] as any)

                            } else {

                                continue

                            }
                        } else {
                            oldVNodeElement.node!.addEventListener(key, newVNodeElement.listeners[key] as any)
                        }
                    }
                }
                if (oldVNodeElement.listeners) {
                    for (const key in oldVNodeElement.listeners) {
                        if (!newVNodeElement.listeners || !(key in newVNodeElement.listeners)) {
                            node!.removeEventListener(key, oldVNodeElement.listeners[key] as any)

                        }
                    }
                }
            }
            //classes
            {
                if (newVNodeElement.classes !== oldVNodeElement.classes) {
                    node.className = newVNodeElement.classes ?? ''
                }
            }
            //styles
            {
                if (newVNodeElement.styles !== oldVNodeElement.styles) {
                    node.setAttribute('style', newVNodeElement.styles ?? '')
                }
            }

            {
                //children
                let newInd = -1
                if (oldVNodeElement.children) {
                    for (const oldInd in oldVNodeElement.children) {
                        const oldChild = oldVNodeElement.children[oldInd]
                        if (oldChild.type === 'INSTANCE_REFERENCE' && oldChild.isFake === true) {
                            continue
                        }
                        newInd += 1
                        if (!newVNodeElement.children || newInd >= newVNodeElement.children.length) {
                            releaseVNode(oldChild, fapleImpl)
                            continue
                        }
                        const newChild = newVNodeElement.children[newInd]
                        if (couldReuse(oldChild, newChild)) {
                            yield [oldChild, newChild]

                        } else {
                            if (oldChild.type === 'CONSTRUCTOR') {
                                releaseVNodeInstanveRoot(oldChild.instance!.$$slot.vNode!, false, fapleImpl)
                            }
                            const newNode = initializeVNode(newChild, false, fapleImpl)
                            node.replaceChild(newNode,
                                oldChild.type === 'INSTANCE_REFERENCE' ? oldChild.vNodeInstanceRoot.elVNode.node! :
                                    (oldChild.type === 'INSTANCE_ROOT' ? oldChild.elVNode.node! :
                                        oldChild.type === 'CONSTRUCTOR' ? oldChild.instance!.$$slot.vNodeEl!.node! : oldChild.node!))

                        }
                    }
                }
                if (newVNodeElement.children) {
                    for (newInd++; newInd < newVNodeElement.children.length; newInd++) {
                        const newNode = initializeVNode(newVNodeElement.children[newInd], false, fapleImpl)
                        node.appendChild(newNode)
                    }
                }

            }

            return
        } else if (oldVNode.type === 'TEXT' && newVNode.type === 'TEXT') {
            newVNode.node = oldVNode.node
            if (oldVNode.text !== newVNode.text) {
                oldVNode.node!.textContent = newVNode.text
            }
            return
        }
        else if (oldVNode.type === 'INSTANCE_REFERENCE' && newVNode.type === 'INSTANCE_REFERENCE') {
            return
        }
        else if (oldVNode.type === 'CONSTRUCTOR' && newVNode.type === 'CONSTRUCTOR') {
            newVNode.instance = oldVNode.instance
            const props = newVNode.instance!.properties ??= {}
            for (const key in props) {
                if (!(key in newVNode.properties)) {
                    delete props[key]
                }
            }
            for (const key in newVNode.properties) {
                if (props[key] !== newVNode.properties[key]) {
                    props[key] = newVNode.properties[key]
                }
            }

            return
        }
        throw '6'
    })
    rec([oldVNode, newVNode])
}