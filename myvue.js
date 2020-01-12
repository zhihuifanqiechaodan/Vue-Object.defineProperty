// 工具类根据指令执行对应方法
const compileUtils = {
	/*
	 * node 当前元素节点
	 * expr 当前指令的value
	 * vm 当前Myvue实例, 
	 * eventName 当前指令事件名称
	 */

	// 由于指令绑定的属性有可能是原始类型,也有可能是引用类型, 因此要取到最终渲染的值
	getValue(expr, vm) {
		// reduce() 方法对数组中的每个元素执行一个由您提供的reducer函数(升序执行)，将其结果汇总为单个返回值。
		return expr.split('.').reduce((data, currentVal) => {
			return data[currentVal]
		}, vm.$data)
	},
	// 这里简单就封装了几个指令方法
	text(node, expr, vm) {
		// 获取当前要节点要更新展示的值
		const value = this.getValue(expr, vm)
		// 更新的工具类
		this.upDater.textUpDater(node, value)
	},
	html(node, expr, vm) {
		const value = this.getValue(expr, vm)
		// 更新的工具类
		this.upDater.htmlUpDater(node, value)
	},
	model(node, expr, vm) {
		const value = this.getValue(expr, vm)
		// 更新的工具类
		this.upDater.modelUpDater(node, value)
	},
	on(node, expr, vm, eventName) {},
	// 更新的工具类
	upDater: {
		// v-text指令的更新函数
		textUpDater(node, value) {
			node.textContent = value
		},
		// v-html指令的更新函数
		htmlUpDater(node, value) {
			node.innerHTML = value
		},
		// v-model指令的更新函数
		modelUpDater(node, value) {
			node.value = value
		}
	}
}
// 指令解析器
class Compile {
	constructor(el, vm) {
		// 判断当前传入的el是不是一个元素节点
		// document.querySelector返回与指定的选择器组匹配的元素的后代的第一个元素。
		this.el = this.isElementNode(el) ? el : document.querySelector(el)
		this.vm = vm
		// 1.匹配节点内容及指令替换相应的内容, 因为每次匹配替换会导致页面回流和重绘, 所以使用文档碎片对象
		// 获取文档碎片对象, 放入内存中会减少页面的回流和重绘
		const fragment = this.node2Fragment(this.el)

		// 2.编译模版
		this.compile(fragment)

		// 3.追加子元素到根元素
		this.el.appendChild(fragment)

	}

	// 判断是否是元素节点
	isElementNode(node) {
		return node.nodeType === 1
	}

	// 将当前根元素中的所有子元素一层层取出来放到文档碎片中, 以减少页面回流和重绘
	node2Fragment(el) {
		// 创建文档碎片对象
		const fragment = document.createDocumentFragment()
		let firstChild;
		// 将当前el节点对象的所有子节点追加到文档碎片对象中
		while (firstChild = el.firstChild) {
			fragment.appendChild(firstChild)
		}
		return fragment
	}

	// 编译模版, 解析指令
	compile(fragment) {
		// 1.获取到所有的子节点, 当前获取的子节点数组是一个伪数组, 需要转为数组
		const childNodes = [...fragment.childNodes]
		childNodes.forEach(child => {
			// 判断当前节点是元素节点还是文本节点
			if (this.isElementNode(child)) {
				// 编译元素节点
				this.compileElement(child)
			} else {
				// 编译文本节点
				this.compileText(child)
			}
			// 递归遍历当前节点时候还有子节点对象
			if (child.childNodes && child.childNodes.length) {
				this.compile(child)
			}
		})

	}

	// 编译元素节点
	compileElement(node) {
		// 根据不同指令属性, 编译模版信息
		const attributes = [...node.attributes];
		attributes.forEach(attr => {
			// 通过解构将指令的name和value获取到
			const {
				name,
				value
			} = attr
			// 判断当前属性是指令还是原生属性
			if (this.isDirective(name)) {
				// 截取指令, 不需要v-
				const directive = name.split('-')[1]
				// 由于指令格式有 v-text v-html v-bind:属性 v-on:事件等等, 按照 : 再次分割
				const [dirName, eventName] = directive.split(':')
				// 更新数据, 数据驱动视图
				compileUtils[dirName](node, value, this.vm, eventName)
				// 删除有指令的标签上的属性
				node.removeAttribute('v-' + directive)
			}
		})
	}

	// 编译文本节点
	compileText(node) {}

	// 判断当前属性是指令还是原生属性
	isDirective(attrName) {
		// startsWith() 方法用来判断当前字符串是否以另外一个给定的子字符串开头，并根据判断结果返回 true 或 false。
		return attrName.startsWith('v-')
	}
}

// Myvue
class Myvue {
	constructor(options) {
		this.$el = options.el;
		this.$data = options.data;
		this.$options = options;
		if (this.$el) {
			// 指令解析起
			new Compile(this.$el, this)
		}
	}
}
