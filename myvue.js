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
	// input双向数据绑定
	setValue(expr, vm, inputVal) {
		// reduce() 方法对数组中的每个元素执行一个由您提供的reducer函数(升序执行)，将其结果汇总为单个返回值。
		return expr.split('.').reduce((data, currentVal) => {
			// 将当前改变的值赋值
			data[currentVal] = inputVal
			console.log(data);
		}, vm.$data)
	},

	// 处理{{person.name}}--{{person.age}}这种格式的数据,不更新值的时候会全部替换了
	getContentVal(expr, vm) {
		return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
			// 获取{{}}中的属性
			return this.getValue(args[1], vm)
		})

	},
	// 这里简单就封装了几个指令方法
	text(node, expr, vm) {
		let value;
		// 处理{{}}的格式
		if (expr.indexOf('{{') !== -1) {
			value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
				// 绑定观察者
				new Watcher(vm, args[1], (newValue) => {
					// 处理{{person.name}}--{{person.age}}这种格式的数据,不然更新值的时候会全部替换了
					this.upDater.textUpDater(node, this.getContentVal(expr, vm))
				})
				// 获取{{}}中的属性
				return this.getValue(args[1], vm)
			})
		} else {
			new Watcher(vm, expr, (newValue) => {
				this.upDater.textUpDater(node, newValue)
			})
			// 获取当前要节点要更新展示的值
			value = this.getValue(expr, vm)
		}
		// 更新的工具类
		this.upDater.textUpDater(node, value)
	},
	html(node, expr, vm) {
		const value = this.getValue(expr, vm)
		// 绑定观察者
		new Watcher(vm, expr, (newValue) => {
			this.upDater.htmlUpDater(node, newValue)
		})
		// 更新的工具类
		this.upDater.htmlUpDater(node, value)
	},
	model(node, expr, vm) {
		const value = this.getValue(expr, vm)
		// 绑定观察者
		new Watcher(vm, expr, (newValue) => {
			this.upDater.modelUpDater(node, newValue)
		})
		node.addEventListener('input', (e) => {
			// 设置值
			this.setValue(expr, vm, e.target.value)
		})
		// 更新的工具类
		this.upDater.modelUpDater(node, value)
	},
	on(node, expr, vm, eventName) {
		// 获取当前指令对应的方法
		const fn = vm.$options.methods && vm.$options.methods[expr]
		// console.log(fn);
		node.addEventListener(eventName, fn.bind(vm), false)
	},
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

// Myvue
class Myvue {
	constructor(options) {
		this.$el = options.el;
		this.$data = options.data;
		this.$options = options;
		if (this.$el) {
			// 1.实现一个数据观察者
			new Observe(this.$data)

			// 2.实现一个指令解析器
			new Compile(this.$el, this)

			// 3.实现this代理, 访问数据可以直接通过this访问
			this.proxyData(this.$data)
		}
	}
	proxyData(data) {
		for (const key in data) {
			Object.defineProperty(this, key, {
				get() {
					return data[key]
				},
				set(newValue) {
					data[key] = newValue
				}
			})
		}
	}
}
