import recursiveFree from 'recursive-free'
import {flatten} from 'lodash'
import Logger from '../logger'
import type { VNode, VNodeElement } from './vnode'
import { Component } from '../component/component'

type ChildT = VNodeElement | Component | string | number | boolean | undefined | null
export type Child = ChildT | Array<ChildT>
const parseChild = recursiveFree<Child, VNode | Array<VNode>>(function* (child) {
    if (Array.isArray(child)) {
        const childArr: Array<VNode> = []
        for (const c of child) {
            childArr.push((yield c) as VNode)
        }
        return childArr
    }
    if (typeof child === 'object' && child !== null) {
        if (child instanceof Component) {
            const slot = child.__slot
            if (!slot.vNode) {
                Logger.error('Child component vNode is undefined')
                throw ''
            }
            return {
                type: 'INSTANCE_REFERENCE',
                vNodeInstanceRoot: slot.vNode!
            }
        } else {
            return child
        }
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
})

// function parseChild(child: Child): VNode | Array<VNode> {

// }

export function jsx(tag: string, props: {
    [index: string]: any
    children?: Child
}, key?: any): VNodeElement {

    const VNode: VNodeElement = {
        type: 'ELEMENT',
        tag,
        key: key
    }

    for (const propKey in props) {
        const prop = props[propKey]
        if (propKey.startsWith('on') && typeof prop === 'function') {
            const eventName = propKey.slice(2).toLowerCase()
            VNode.listeners ??= {}
            VNode.listeners[eventName] = prop
            continue
        }
        if (propKey === 'children') {
            const children = props.children
            const c = parseChild(children)
            if (Array.isArray(c)) {
                
                VNode.children = flatten(c)
            }
            else {
                VNode.children = [c]
            }

            // if (Array.isArray(children)) {
            //     for (const child of children) {
            //         const c = parseChild(child)

            //         VNode.children.push(...Array.isArray(c) ? c : [c])
            //     }
            // } else {
            //     const child = children
            //     const c = parseChild(child)
            //     VNode.children.push(...Array.isArray(c) ? c : [c])
            // }
            continue
        }
        if (propKey === 'class') {
            // VNode.classesRaw = prop
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
            Logger.error('Not supported property', prop)
            throw ''
        }


        VNode.attributes[propKey] = parsedProp


    }
    return VNode
}

export const jsxs = jsx