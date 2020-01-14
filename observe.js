// 观察者
class Watcher {
	constructor(vm, expr, cb) {
		this.vm = vm
		this.expr = expr
		this.cb = cb
		// 存储旧值
		this.oldValue = this.getOldValue()
	}
	// 获取旧值
	getOldValue() {
		// 在获取旧值的时候将观察者挂在到Dep订阅器上
		Dep.target = this
		const oldValue = compileUtils.getValue(this.expr, this.vm)
		// 销毁Dep上的观察者
		Dep.target = null
	}

	// 更新视图
	upDate() {
		// 获取新值
		const newValue = compileUtils.getValue(this.expr, this.vm)
		if (newValue !== this.oldValue) {
			this.cb(newValue)
		}
	}
}

// 订阅器
class Dep {
	constructor() {
		this.subs = []
	}
	// 收集观察者
	addSub(watcher) {
		this.subs.push(watcher)
	}
	// 通知观察者去更新视图
	notify() {
		this.subs.forEach(watcher => {
			watcher.upDate()
		})
	}
}

// 数据劫持
class Observe {
	constructor(data) {
		this.observe(data)
	}
	// 使用object.defineProperty监听对象, 数组暂时不考虑,太复杂
	observe(data) {
		if (data && typeof data === 'object') {
			// console.log(data);
			Object.keys(data).forEach(key => {
				this.defineReactive(data, key, data[key])
			})
		}
	}

	// 劫持属性
	defineReactive(obj, key, value) {
		// 递归遍历
		this.observe(value)
		// 创建依赖收集器
		const dep = new Dep()
		// console.log(dep);
		Object.defineProperty(obj, key, { // obj为已有对象, key为属性, 第三个参数为属性描述符
			enumerable: true, // enumerable：是否可以被枚举(for in)，默认false
			configurable: false, // 是否可以被删除，默认false
			// 获取
			get() {
				// console.log(dep.target);
				// 订阅数据变化时, 往Dep中添加观察者
				Dep.target && dep.addSub(Dep.target)
				return value
			},
			// 设置
			set: (newValue) => {
				// 这里要注意新设置的值也需要劫持他的属性
				this.observe(newValue)
				if (newValue !== value) {
					value = newValue
				}
				// 通知订阅器找到对应的观察者,通知观察者更新视图
				dep.notify()
			}
		})
	}
}
