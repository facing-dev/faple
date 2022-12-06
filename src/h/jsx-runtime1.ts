type Child = HTMLElement | string | number | boolean | undefined | null

function parseChild(child: Child) {
    if (child instanceof HTMLElement) {
        return child
    }
    if (typeof child === 'string') {
        return document.createTextNode(child)
    }
    if (child === true) {
        return document.createTextNode('true')
    }
    if (child === false) {
        return document.createTextNode('false')
    }
    if (typeof child === 'number') {
        return document.createTextNode(String(child))
    }
    if (typeof child === 'undefined') {
        return document.createTextNode('undefined')
    }
    if (child === null) {
        return document.createTextNode('null')
    }
    throw ''
}

export function jsx(tag: string, props: {
    [index: string]: any
    children?: Child | Child[]
}) {
    console.log(arguments)
    const el = document.createElement(tag)
    for (const propKey in props) {
        const prop = props[propKey]
        if (propKey.startsWith('on') && typeof prop === 'function') {
            const eventName = propKey.slice(2).toLowerCase()
            el.addEventListener(eventName, prop)
            continue
        }
        if (propKey === 'children') {
            const children = props.children
            if (typeof children === 'undefined') {
                continue
            }
            if (Array.isArray(children)) {
                for (const child of children) {
                    el.append(parseChild(child))
                }
            } else {
                const child = children
                el.appendChild(parseChild(child))
            }
            continue
        }
        let parsedProp = prop
        if (typeof prop === 'string') {
        } else if (typeof prop === 'number') {
            parsedProp = String(prop)
        } else if (typeof prop === 'undefined' || prop === null) {
            continue
        } else if (prop === true) {
            parsedProp = ''
        } else if (prop === false) {
            el.removeAttribute(propKey)
            continue
        }
        el.setAttribute(propKey, parsedProp)

    }
    return el
}
export const jsxs = jsx