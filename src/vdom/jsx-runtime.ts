import { flatten } from 'lodash-es'
import Logger from '../logger'
import { VNode, VNodeElement, VNodeInstanceReference, VNodeText, makeVNode, isVNode } from './vnode'
import { Component } from '../component/component'
import { VoidElementTags } from './def'
type ChildT = VNodeElement | Component | string | number | boolean | Object | Array<any> | undefined | null
export type Child = ChildT | Array<ChildT>
const parseChild = function (child: ChildT): VNode {
    if (typeof child === 'object' && child !== null) {
        if (child instanceof Component) {
            const slot = child.$$slot
            if (!slot.vNode) {
                Logger.error('Child component vNode is undefined')
                throw ''
            }
            const vNode = slot.vNode
            const newVNode: VNodeInstanceReference = makeVNode({
                type: 'INSTANCE_REFERENCE',
                vNodeInstanceRoot: vNode,
                isFake: false,
            })
            vNode.previousVNodeInstanceReference = vNode.currentVNodeInstanceReference
            vNode.currentVNodeInstanceReference = newVNode
            return newVNode
        }
        if (isVNode(child)) {
            return child
        }

        return makeVNode({
            type: 'TEXT',
            text: JSON.stringify(child)
        })

    }

    if (typeof child === 'string') {
        return {
            type: 'TEXT',
            text: child
        }
    }
    if (child === true) {
        return {
            type: 'TEXT',
            text: ''
        }
    }
    if (child === false) {
        return {
            type: 'TEXT',
            text: ''
        }
    }
    if (typeof child === 'number') {
        return {
            type: 'TEXT',
            text: String(child)
        }
    }
    if (typeof child === 'undefined') {
        return {
            type: 'TEXT',
            text: ''
        }
    }
    if (child === null) {
        return {
            type: 'TEXT',
            text: 'null'
        }
    }

    Logger.error('Can not parse child', child)
    throw ''
}

export function jsx(tag: string, props: {
    [index: string]: any
    children?: Child
}, key?: any): VNodeElement {
    tag = tag.toLowerCase()
    const VNode: VNodeElement = makeVNode({
        type: 'ELEMENT',
        tag,
        key: key
    })

    for (const propKey in props) {
        const prop = props[propKey]
        if (propKey === 'ref' && VNode.type === 'ELEMENT') {
            VNode.ref = prop
            continue
        }
        if (propKey.startsWith('on') && typeof prop === 'function') {
            const eventName = propKey.slice(2).toLowerCase()
            VNode.listeners ??= {}
            VNode.listeners[eventName] = prop
            continue
        }
        if (propKey === 'children' && props.children !== undefined) {
            const children: Array<ChildT> = Array.isArray(props.children) ? flatten(props.children) : [props.children]
            VNode.children = children.map(child => parseChild(child))
            if (VNode.children && VNode.children.length > 0 && VoidElementTags.has(VNode.tag)) {
                Logger.error('VNode.children.size > 0 in an empty tag', VNode)
                throw ''
            }

            //merge text node
            if (VNode.children) {
                let lastTextNode: VNodeText | null = null
                for (let i = 0; i < VNode.children.length;) {
                    const child = VNode.children[i]
                    if (child.type === 'TEXT') {
                        if (!lastTextNode) {
                            lastTextNode = child
                        } else {
                            lastTextNode.text += child.text
                            VNode.children.splice(i, 1)
                            continue
                        }
                    }
                    if (lastTextNode && child.type !== 'TEXT') {
                        lastTextNode = null
                    }
                    i++
                }
            }
            continue
        }
        if (propKey === 'class') {
            if (typeof prop === 'string') {
                VNode.classes = prop
            }
            if (typeof prop === 'object') {
                if (Array.isArray(prop)) {
                    VNode.classes = [...prop].join(' ')
                } else {
                    VNode.classes = Object.keys(prop).reduce<string[]>((pv, cv) => {
                        if (prop[cv]) {
                            pv.push(cv)
                        }
                        return pv
                    }, []).join(' ')
                }
            }
            continue
        }
        if (propKey === 'style') {
            if (typeof prop === 'string') {
                VNode.styles = prop
            }
            if (typeof prop === 'object') {
                VNode.styles = Object.keys(prop).reduce<string[]>((pv, cv) => {

                    //fooBar to foo-bar
                    const key = cv[0].toLowerCase() + cv.slice(1).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)

                    pv.push(`${key}:${prop[cv]}`)
                    return pv
                }, []).join(';')
            }

            continue
        }
        if (propKey === 'rawHtml') {
            if (typeof prop !== 'string') {
                throw ''
            }
            VNode.rawHtml = prop
            continue
        }
        VNode.attributes ??= {}
        let parsedProp: string | null = null
        if (typeof prop === 'string') {
            parsedProp = prop
        } else if (typeof prop === 'number') {
            parsedProp = String(prop)
        } else if (typeof prop === 'undefined' || prop === null) {
            continue
        } else if (prop === true) {
            parsedProp = ''
        } else if (prop === false) {
            delete VNode.attributes[propKey]
            continue
        }
        if (parsedProp === null) {
            Logger.error('Not supported attribute', prop)
            throw ''
        }


        VNode.attributes[propKey] = parsedProp


    }
    return VNode
}

export const jsxs = jsx