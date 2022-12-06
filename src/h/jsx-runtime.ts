export interface VNodeEl {
    type: 'VNodeEl'
    key?: any
    tag: string
    attrs: { [index in string]: string }
    listeners: { [index in string]: Function }
    children: Array<VNode>
    node?: HTMLElement
}

interface VNodeText {
    type: 'VNodeText'
    text: string
    node?: Text
}

export type VNode = VNodeEl | VNodeText




type ChildT = VNodeEl | string | number | boolean | undefined | null
type Child = ChildT | Array<ChildT>

function parseChild(child: Child): VNode | Array<VNode> {
    if (Array.isArray(child)) {
        return child.map(c => parseChild(c)) as Array<VNode>
    }
    if (typeof child === 'object' && child !== null && child.type === 'VNodeEl') {
        return child
    }
    if (typeof child === 'string') {
        return {
            type: 'VNodeText',

            text: child
        }
    }
    if (child === true) {
        return {
            type: 'VNodeText',
            text: 'true'
        }
    }
    if (child === false) {
        return {
            type: 'VNodeText',
            text: 'false'
        }
    }
    if (typeof child === 'number') {
        return {
            type: 'VNodeText',
            text: String(child)
        }
    }
    if (typeof child === 'undefined') {
        return {
            type: 'VNodeText',
            text: 'undefined'
        }
    }
    if (child === null) {
        return {
            type: 'VNodeText',
            text: 'null'
        }
    }


    throw 'j1'
}

export function jsx(tag: string, props: {
    [index: string]: any
    children?: Child | Child[]
}, key?: any): VNodeEl {
    const VNode: VNodeEl = {
        type: 'VNodeEl',
        tag,
        attrs: {},
        listeners: {},
        children: [],
        key: key
    }

    for (const propKey in props) {
        const prop = props[propKey]
        if (propKey.startsWith('on') && typeof prop === 'function') {
            const eventName = propKey.slice(2).toLowerCase()
            VNode.listeners[eventName] = prop
            continue
        }
        if (propKey === 'children') {
            const children = props.children
            if (typeof children === 'undefined') {
                continue
            }
            if (Array.isArray(children)) {
                for (const child of children) {
                    const c = parseChild(child)
                    VNode.children.push(...Array.isArray(c) ? c : [c])
                }
            } else {
                const child = children
                const c = parseChild(child)
                VNode.children.push(...Array.isArray(c) ? c : [c])
            }
            continue
        }
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
            delete VNode.attrs[propKey]
            continue
        }
        if (parsedProp === null) {
            throw 'j2'
        }


        VNode.attrs[propKey] = parsedProp


    }
    return VNode
}

export const jsxs = jsx