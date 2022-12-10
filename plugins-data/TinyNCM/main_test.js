// polyfill for <0.2.6
betterncm.tests={
    async fail(reason) {
        await betterncm.fs.writeFileText("/__TEST_FAILED__.txt", reason);
    }, async success(message) {
        await betterncm.fs.writeFileText("/__TEST_SUCCEEDED__.txt", message);
    }
}

Promise.race([
    betterncm.utils.waitForElement(".m-list-recmd div h3 a[data-da-event]").then(e=>{
        betterncm.tests.success(e.innerText)
    }),
    betterncm.utils.delay(3000).then(_=>{
        betterncm.tests.fail("Get Name timeout"); 
    })
])