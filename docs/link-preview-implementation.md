# TiddlyWiki5 鼠标悬浮链接预览 - 最佳实践研究报告

## 一、核心机制研究

### 1.1 EventCatcher Widget (推荐方式)

**EventCatcher Widget** 是 TiddlyWiki v5.1.23+ 引入的高级事件处理机制，可以捕获 DOM 事件并触发 Action Widgets。

**核心优势：**
- ✅ 纯 wikitext 实现，无需 JavaScript startup module
- ✅ 性能优秀（事件委托机制）
- ✅ 支持 `mouseover`、`mouseout` 等所有 DOM 事件
- ✅ 提供丰富的变量（坐标、DOM 属性等）

**基本语法：**
```wikitext
<$eventcatcher 
  selector=".tc-tiddlylink" 
  $mouseover=<<show-actions>> 
  $mouseout=<<hide-actions>>
  tag="div"
>
  <!-- 内容区域 -->
</$eventcatcher>
```

**可用变量：**
- `dom-*`: 匹配元素的所有 DOM 属性
- `event-type`: 事件类型
- `tv-popup-coords`: 相对坐标（用于定位弹窗）
- `tv-popup-abs-coords`: 绝对坐标（v5.2.4+）
- `tv-selectednode-*`: 选中节点的尺寸和位置
- `event-fromviewport-pos*`: 事件相对于视口的位置

### 1.2 Reveal Widget + Popup 机制

**Reveal Widget** 用于条件显示内容，配合 popup 机制实现弹窗。

**popup 类型的 Reveal：**
```wikitext
<$reveal type="popup" state="$:/state/myPopup" position="below">
  <div class="tc-popup-keep">
    弹窗内容
  </div>
</$reveal>
```

**重要属性：**
- `type="popup"`: 启用 popup 定位
- `position`: 位置（left, above, aboveleft, aboveright, right, belowleft, belowright, below）
- `class="tc-popup-keep"`: 点击内部不关闭（sticky popup）
- `retain="yes"`: 隐藏时保留内容（配合 animate）
- `animate="yes"`: 动画效果（需要 retain="yes"）

### 1.3 Action-Popup Widget

**Action-Popup Widget** 用于触发或关闭弹窗。

```wikitext
<$action-popup 
  $state="$:/state/myPopup" 
  $coords=<<tv-popup-coords>> 
  $floating="no"
/>
```

**重要参数：**
- `$state`: 状态 tiddler 的标题
- `$coords`: 坐标字符串（相对或绝对）
- `$floating`: 是否为浮动弹窗（需要显式关闭）
- 如果 `$coords` 为空，则关闭所有弹窗

### 1.4 坐标系统 (v5.2.4+)

**相对坐标格式：** `(left,top,right,bottom)`
- 相对于触发元素的边界框

**绝对坐标格式：** `[(left,top,width,height)]`
- 相对于视口的绝对位置

---

## 二、纯 Wikitext 实现方案

### 方案 A: EventCatcher + Reveal Widget（推荐）

这是**最现代、最优雅**的实现方式，完全不需要 JavaScript。

#### 2.1 PageTemplate Tiddler

创建 `$:/plugins/yourname/link-preview/page-template`

```wikitext
title: $:/plugins/yourname/link-preview/page-template
tags: $:/tags/PageTemplate

\define show-preview-actions()
<$action-popup 
  $state="$:/state/link-preview/popup" 
  $coords=<<tv-popup-coords>>
/>
<$action-setfield 
  $tiddler="$:/state/link-preview/current" 
  $field="text" 
  $value=<<dom-href>>
/>
<$action-setfield 
  $tiddler="$:/state/link-preview/current" 
  $field="link-title" 
  $value=<<dom-data-tiddler-title>>
/>
\end

\define hide-preview-actions()
<$action-popup 
  $state="$:/state/link-preview/popup"
/>
\end

<$eventcatcher
  selector=".tc-tiddlylink"
  $mouseover=<<show-preview-actions>>
  $mouseout=<<hide-preview-actions>>
  tag="div"
  class="link-preview-catcher"
>
  <$reveal 
    type="popup" 
    state="$:/state/link-preview/popup"
    position="belowleft"
    class="tc-popup-keep link-preview-popup"
    animate="yes"
    retain="yes"
  >
    <div class="link-preview-container">
      <$tiddler tiddler={{$:/state/link-preview/current!!link-title}}>
        <$transclude tiddler="$:/plugins/yourname/link-preview/template" mode="block"/>
      </$tiddler>
    </div>
  </$reveal>
  
  {{||$:/core/ui/PageTemplate}}
</$eventcatcher>
```

**关键要点：**
1. ✅ 使用 `$:/tags/PageTemplate` 标签在页面级别包裹所有内容
2. ✅ EventCatcher 捕获所有 `.tc-tiddlylink` 的鼠标事件
3. ✅ `dom-data-tiddler-title` 获取链接指向的 tiddler 标题
4. ✅ 使用 state tiddler 存储当前预览的 tiddler
5. ✅ Reveal widget 在合适位置显示弹窗

#### 2.2 预览模板 Tiddler

创建 `$:/plugins/yourname/link-preview/template`

```wikitext
title: $:/plugins/yourname/link-preview/template
type: text/vnd.tiddlywiki

<div class="preview-header">
  <h3><$link to=<<currentTiddler>>><$view field="title"/></$link></h3>
</div>

<div class="preview-meta">
  <$list filter="[<currentTiddler>has[subtitle]]" variable="ignore">
    <div class="preview-subtitle">
      <$view field="subtitle"/>
    </div>
  </$list>
  
  <div class="preview-info">
    <span class="preview-modified">
      Modified: <$view field="modified" format="relativedate"/>
    </span>
  </div>
</div>

<div class="preview-content">
  <$transclude mode="block" />
</div>

<div class="preview-tags">
  <$list filter="[<currentTiddler>tags[]]">
    <$link to=<<currentTiddler>>>
      <$macrocall $name="tag-pill" tag=<<currentTiddler>>/>
    </$link>
  </$list>
</div>
```

#### 2.3 样式 Tiddler

创建 `$:/plugins/yourname/link-preview/styles`

```css
title: $:/plugins/yourname/link-preview/styles
tags: $:/tags/Stylesheet
type: text/css

.link-preview-catcher {
  /* EventCatcher 容器不影响布局 */
  position: relative;
}

.link-preview-popup {
  /* 弹窗基础样式 */
  z-index: 10000;
  max-width: 600px;
  min-width: 300px;
  font-size: 0.9em;
}

.link-preview-container {
  /* 毛玻璃效果 */
  backdrop-filter: blur(10px) saturate(180%);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

/* 暗色主题适配 */
html[data-theme="dark"] .link-preview-container {
  background: rgba(40, 40, 40, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.preview-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.2em;
}

.preview-meta {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.85em;
}

html[data-theme="dark"] .preview-meta {
  color: rgba(255, 255, 255, 0.6);
}

.preview-content {
  margin: 12px 0;
  line-height: 1.6;
  /* 限制内容显示行数 */
  display: -webkit-box;
  -webkit-line-clamp: 10;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-tags {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

html[data-theme="dark"] .preview-tags {
  border-top-color: rgba(255, 255, 255, 0.1);
}

/* 动画效果 */
.link-preview-popup {
  animation: preview-fade-in 0.2s ease-out;
}

@keyframes preview-fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 滚动条美化 */
.link-preview-container::-webkit-scrollbar {
  width: 6px;
}

.link-preview-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.link-preview-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.link-preview-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
```

---

## 三、需要 JS 时的 .tid + .meta 实现方式

如果确实需要 JavaScript（比如需要延迟、防抖等高级功能），推荐使用 `.ts` 文件 + `.ts.meta` 的方式。

### 3.1 TypeScript 模块文件

创建 `link-hover.ts`

```typescript
/*\
title: $:/plugins/yourname/link-preview/link-hover.ts
type: application/javascript
module-type: startup

Link hover preview with debounce
\*/

export const name = "link-preview-hover";
export const platforms = ["browser"];
export const after = ["render"];
export const synchronous = true;

export function startup() {
  let timeout: number | null = null;
  const delay = 500; // 500ms 延迟
  
  // 监听所有链接的鼠标事件
  document.addEventListener('mouseover', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('.tc-tiddlylink');
    
    if (!link) return;
    
    // 清除之前的定时器
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // 延迟显示
    timeout = window.setTimeout(() => {
      const title = link.getAttribute('data-tiddler-title');
      if (!title) return;
      
      // 设置状态
      $tw.wiki.setText('$:/state/link-preview/current', 'text', null, title);
      
      // 触发 popup
      const rect = link.getBoundingClientRect();
      const coords = `[(${rect.left},${rect.bottom},${rect.width},0)]`;
      $tw.wiki.setText('$:/state/link-preview/popup', 'text', null, coords);
    }, delay);
  }, true);
  
  document.addEventListener('mouseout', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('.tc-tiddlylink');
    
    if (!link) return;
    
    // 清除定时器
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    
    // 延迟关闭
    setTimeout(() => {
      const popup = document.querySelector('.link-preview-popup:hover');
      if (!popup) {
        $tw.wiki.deleteTiddler('$:/state/link-preview/popup');
      }
    }, 100);
  }, true);
}
```

### 3.2 Meta 文件

创建 `link-hover.ts.meta`

```
title: $:/plugins/yourname/link-preview/link-hover.ts
type: application/javascript
module-type: startup
```

---

## 四、对比分析

### 4.1 纯 Wikitext 方案

**优点：**
- ✅ 无需编写 JavaScript
- ✅ 易于维护和调试
- ✅ 完全使用 TiddlyWiki 原生机制
- ✅ 性能好（事件委托）
- ✅ 兼容性好

**缺点：**
- ⚠️ 无法实现延迟显示（立即触发）
- ⚠️ 无法实现防抖
- ⚠️ 无法实现复杂的鼠标移动逻辑

**适用场景：**
- 简单的悬浮预览需求
- 不需要延迟和复杂交互
- 希望保持纯 wikitext 的插件

### 4.2 JavaScript 方案

**优点：**
- ✅ 可以实现延迟显示
- ✅ 可以实现防抖/节流
- ✅ 可以实现复杂的交互逻辑
- ✅ 更细粒度的控制

**缺点：**
- ⚠️ 需要编写和维护 JS 代码
- ⚠️ 可能有性能问题（需要优化）
- ⚠️ 调试相对复杂

**适用场景：**
- 需要延迟显示避免误触
- 需要复杂的鼠标交互逻辑
- 对用户体验要求高

---

## 五、推荐的最终方案

### 方案选择建议：

1. **简单场景（推荐）**: 使用 **纯 Wikitext + EventCatcher** 方案
   - 实现简单，维护容易
   - 性能优秀
   - 符合 TiddlyWiki 哲学

2. **复杂场景**: 使用 **混合方案**
   - 基础结构用 wikitext（PageTemplate + Reveal）
   - 事件处理用 TypeScript（延迟、防抖）
   - 渲染模板用 wikitext

### 最佳实践总结：

#### ✅ 推荐做法：

1. 使用 `$:/tags/PageTemplate` 在页面级包裹 EventCatcher
2. 使用 `EventCatcher Widget` 处理鼠标事件
3. 使用 `Reveal Widget` + `type="popup"` 显示弹窗
4. 使用 state tiddler 管理状态
5. 使用 CSS `backdrop-filter` 实现毛玻璃效果
6. 使用 `tc-popup-keep` class 让弹窗在点击内部时不关闭

#### ❌ 避免做法：

1. 不要全局修改核心 link widget
2. 不要使用 `$:/tags/RawMarkup` 注入全局 JS
3. 不要在每个链接上绑定独立的事件监听器
4. 不要使用 `.js` 文件（使用 `.ts` 更好）
5. 不要忘记处理暗色主题

---

## 六、完整的插件结构

```
$:/plugins/yourname/link-preview/
├── plugin.info                 # 插件元信息
├── page-template.tid          # PageTemplate (EventCatcher)
├── preview-template.tid       # 预览内容模板
├── styles.tid                 # 样式（毛玻璃效果）
├── config.tid                 # 配置界面（可选）
├── readme.tid                 # 说明文档
└── (可选) link-hover.ts       # JS 模块（如需延迟等功能）
    └── link-hover.ts.meta     # Meta 文件
```

### plugin.info 示例：

```json
{
  "title": "$:/plugins/yourname/link-preview",
  "description": "Modern link hover preview with glass effect",
  "author": "YourName",
  "version": "1.0.0",
  "core-version": ">=5.2.0",
  "plugin-type": "plugin",
  "list": "readme config"
}
```

---

## 七、进一步优化建议

### 7.1 性能优化

1. **内容截断**: 在模板中限制预览内容长度
2. **懒加载**: 只在需要时加载完整内容
3. **缓存**: 使用 state tiddler 缓存预览内容

### 7.2 用户体验

1. **渐变动画**: 使用 CSS animation 平滑显示
2. **位置智能调整**: 根据视口边界调整弹窗位置
3. **快捷键**: 支持 ESC 键关闭预览
4. **可配置**: 提供配置选项（延迟时间、样式等）

### 7.3 可访问性

1. **ARIA 标签**: 添加合适的 aria 属性
2. **键盘导航**: 支持键盘操作
3. **屏幕阅读器**: 提供描述文本

---

## 八、参考资源

### 官方文档：

- [EventCatcherWidget](https://tiddlywiki.com/static/EventCatcherWidget.html)
- [RevealWidget](https://tiddlywiki.com/static/RevealWidget.html)
- [ActionPopupWidget](https://tiddlywiki.com/static/ActionPopupWidget.html)
- [ActionWidgets](https://tiddlywiki.com/static/ActionWidgets.html)
- [PopupMechanism](https://tiddlywiki.com/static/PopupMechanism.html)
- [SystemTags](https://tiddlywiki.com/static/SystemTags.html)

### 社区讨论：

- [Talk TiddlyWiki - Preview Plugin](https://talk.tiddlywiki.org/)
- [GitHub - tobibeer/tw5-preview](https://github.com/tobibeer/tw5-preview)

---

## 九、结论

对于现代 TiddlyWiki5 插件开发，**推荐使用纯 Wikitext + EventCatcher 方案**，这是最符合 TiddlyWiki 哲学的实现方式。只有在确实需要延迟、防抖等高级功能时，才考虑添加 TypeScript 模块。

通过合理使用 EventCatcher、Reveal Widget 和 Action Widgets，可以实现一个功能完整、性能优秀、易于维护的链接预览插件，而无需编写任何 JavaScript 代码。
