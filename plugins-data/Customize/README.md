<div align="center"><image width="140em" src="https://user-images.githubusercontent.com/66859419/183120498-1dede5b4-0666-4891-b95f-c3a812b3f12f.png" /></div>
<h1 align="center">BetterNCM Plugin Customize</h1>
<h3 align="center">注入你的 CSS，让网易云变成你的形状</h3>

![cover](./cover.png)

## Example

以下代码魔改了 RedefineNowPlaying，保存后可能需要重启网易云音乐

```css
body.rectangle-cover .g-single-track .g-singlec-ct .n-single .sd {
    width: clamp(280px,20vw,400px);
}
.g-single .g-singlec-ct .n-single .mn .head .inf .title h1 {
    font-size: 20px!important;
}
.g-single-track .g-singlec-ct .n-single .mn {
    margin-bottom: -30px;
}
```

![example](./example.png)
