# SimpleCSS for BetterNCM

一个为 [BetterNCM](https://github.com/std-microblock/chromatic/tree/v2) 设计的轻量级自定义 CSS 注入插件。

本项目部分使用了 Google Gemini 进行了代码的撰写。

## ✨ 特性

- **实时预览**：输入 CSS 代码后立即在网易云音乐客户端中生效。
- **自动保存**：代码改动会自动保存到 BetterNCM 配置文件中，重启客户端不丢失。
- **极简设计**：没有复杂的依赖，专注于样式修改。

## 🛠️ 使用方法

1. 在 BetterNCM 的插件市场下载 **SimpleCSS**。
2. 重启网易云音乐，在插件管理列表中找到 **SimpleCSS** 并双击。
3. 在弹出的编辑器中输入你的 CSS 代码。

### 示例

将“发现音乐”板块的顶部栏背景设置为透明：

```css
.m-tabwrap {
    background: transparent !important;
    background-color: transparent !important;
}
```
## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个插件。

## 📄 许可证

本项目基于 GPL-3.0 协议开源。
