# BetterNCM - Plugin Library

本 Repo 是 BetterNCM 的插件库

## 插件提交及更新

0. 确认你的插件符合[上架准则](https://github.com/MicroCBer/BetterNCM/wiki/%E6%8F%92%E4%BB%B6%E5%95%86%E5%BA%97%E4%B8%8A%E6%9E%B6%E6%8F%92%E4%BB%B6%E6%96%B9%E5%BC%8F%E5%8F%8A%E5%87%86%E5%88%99#%E4%B8%8A%E6%9E%B6%E5%87%86%E5%88%99)
1. Fork 本仓库
2. 在 `plugins-list` 目录下创建一个 JSON 文件，内容如下

```js
{
    "name": "ExamplePlugin", // 插件名
    "repo": "BetterNCM/example-plugin", // 插件的 Repo
    "branch": "main", // 分支名
    "subpath": "/", // 插件在 repo 中的子目录 （可选）
    "author": "Author" // 作者
}
```

3. 提交 PR
4. 脚本会定时抓取插件 Manifest 中的版本号，并自动提交更新及审核。你还可以在 QQ 群中发送 `update` 以手动触发抓取脚本。
5.
![image](https://user-images.githubusercontent.com/66859419/226158790-c6d3a57e-9ea3-4337-9a91-373838e83cc0.png)


## 注意

+ 请确保要同步到此仓库的插件目录中，没有多余的文件（除了插件运行所必须的文件和插件预览图）。
+ 或者创建 .betterncm-ignore 文件来过滤不需要的文件（格式类似 .gitignore）。
+ 请压缩预览图，保证预览图不要过大
+ Native 插件必须使用 GitHub Action 编译。

## Manifest.json 格式

```js
{
    "$schema": "https://raw.githubusercontent.com/BetterNCM/BetterNCM-Plugins/refs/heads/master/manifest-schema.json",
    "manifest_version": 1, // manifest 版本，必为 1
    "name": "ExamplePlugin", // 插件名
    "slug": "example-plugin", // 插件唯一识别名（英文、数字、横杠与下划线） (留空则根据插件名自动生成)（如果插件名有中文请填写该字段）
    "fork_of": "example-plugin-origin", // 若为其他插件的变体/Fork，此用于标记源插件的 slug
    "version": "0.1.0", // 插件版本，推荐使用语义化版本（https://semver.org/）
    "betterncm_version": ">=1.0.0", // 依赖的 BetterNCM 版本
    "author": "Author", // 插件作者
    "author_link": "https://example.com", // 作者链接（可选）
    "description": "Description of the plugin", // 插件描述
    "preview": "preview.png", // 插件预览图
    "type": "extension", // 插件类型（可选）：extension (默认) | theme | dependency"
    "require_restart": false, // 是否要求重启网易云音乐客户端以加载插件，不填则通过是否存在 native_plugin 判断（可选）
    "requirements": ["example-dependency"], // 依赖的插件 Slug（可选）
    "noDevReload": false, // 是否禁用自带的开发重载功能，适用于那些需要自制热重载的插件开发者们，默认不禁用
    "loadBefore": ["example-plugin1", "example-plugin2"], // 在指定的插件之前加载（可选）
    "loadAfter": ["example-plugin3", "example-plugin4"], // 在指定的插件之后加载（可选）
    "force-install": false, // 强制安装（需要在审核中告知理由）
    "force-update": "< 0.1.0", // 强制更新（如此处强制更新版本号 < 0.1.0 的版本到最新）
    "force-uninstall": false, // 强制卸载（适用于插件崩了的情况）
    "startup_script": "startup_script.js", // 插件启动时执行的脚本文件路径（可选，默认加载 startup_script.js）
    "ncm-version-req": "> 2.10.2", // 兼容的网易云音乐客户端版本范围要求（可选，默认 "> 2.10.2"）
    "ncm3-compatible": true, // 是否兼容网易云 3.0.0+ 版本

    "injects": { // 在指定页面或路径下需要注入的脚本文件
        "Main": [  // 在该页面或路径下需要注入的脚本列表，Main 是 /pub/app.html 的别名
            {
                "file": "main.js"  // 脚本文件的相对路径，必须以 .js 或 .mjs 结尾
            }
        ],
        "/some/other/path.html": [
            {
                "file": "specific_page_script.js"
            }
        ]
    },
    "hijacks": {  // 网易云请求修改（可选）
        "> 2.10.0 <= 2.10.6": {  // 版本，支持Range
            "orpheus://orpheus/pub/core.e5842f1.js": { // URL，开头部分匹配即可
            //(如 orpheus://orpheus/pub/core.e5842f1.js?abcdefg 将被匹配到)

                "type":"replace", // 类型，支持 replace, regex, append, prepend
                "from":"var o;if(((this.U()||C).from||C).id==t)", // replace 和 regex 必填：搜索项/正则表达式
                "to":";expose(a);var o;if(((this.U()||C).from||C).id==t)" // replace 和 regex 必填：替换后的内容
            },
            "orpheus://another/target/file.js": [ // 也可以是数组
                {
                    "type": "regex",
                    "from": "function\\s*a\\(\\)\\{.*\\}",
                    "to": "function a(){ return true; }"
                },
                {
                    "type": "append",
                    "code": "console.log(\"这段代码会被追加到文件末尾\");" // append 和 prepend 必填：需要注入的代码
                },
                {
                    "type": "prepend",
                    "code": "console.log(\"这段代码会被插入到文件头部\");"
                }
            ]
        }
    },
    "native_plugin": "native.dll", // 需要注入的 native dll （可选）（接口参考文档及已有 native 插件）
}
```
