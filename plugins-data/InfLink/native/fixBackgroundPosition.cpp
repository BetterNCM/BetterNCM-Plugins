#include "pch.h"
#include <include/capi/cef_task_capi.h>
#include <include/capi/cef_v8_capi.h>
#include <thread>
#include <atomic>

typedef struct _cef_task_post_win_pos {
	cef_task_t task;
	cef_v8context_t* ctx;
} cef_task_post_int;

void CEF_CALLBACK execFixWinPos(struct _cef_task_t* self) {
	auto ctx = ((_cef_task_post_win_pos*)self)->ctx;
	auto frame = ctx->get_frame(ctx);
	cef_domvisitor_t* visitor = new cef_domvisitor_t{};
	visitor->base.size = sizeof(cef_domvisitor_t);
	visitor->visit = [](struct _cef_domvisitor_t* self,
		struct _cef_domdocument_t* document) {

			auto dom = document->get_element_by_id(document, CefString("InfLink_Background").GetStruct());
			dom = dom->get_first_child(dom);

			HWND ncmWin = FindWindow(L"OrpheusBrowserHost", NULL);
			int x = 0, y = 0;
			RECT rect = { NULL };

			int xo = GetSystemMetrics(SM_XVIRTUALSCREEN);
			int yo = GetSystemMetrics(SM_YVIRTUALSCREEN);

			if (GetWindowRect(ncmWin, &rect)) {
				x = rect.left;
				y = rect.top;
			}

			dom->set_element_attribute(dom,
				CefString("style").GetStruct(),
				CefString("margin-left: -" + std::to_string(x - xo) + "px;" +
					"margin-top: -" + std::to_string(y - yo) + "px;").GetStruct());
	};

	if (frame)
		frame->visit_dom(frame, visitor);



}

std::atomic<bool> enableFixWinBGPos{ false };

std::thread* pPostWinPosThread;

char* fixBGPosition(void** args) {
	bool enable = *((bool*)(args[0]));
	auto ctx = cef_v8context_get_current_context();
	auto runner = ctx->get_task_runner(ctx);
	enableFixWinBGPos = enable;
	if (!pPostWinPosThread) {
		enableFixWinBGPos = true;
		pPostWinPosThread = new std::thread([=]() {
			while (1) {
				Sleep(30);
				if (!enableFixWinBGPos)continue;

				auto frame = ctx->get_frame(ctx);
				cef_task_post_int* task = (cef_task_post_int*)calloc(1, sizeof(cef_task_post_int));
				task->ctx = ctx;
				task->task.base.size = sizeof(cef_task_t);

				((cef_task_t*)task)->execute = execFixWinPos;
				runner->post_task(runner, (cef_task_t*)task);
			}

			});
	}

	std::string str = std::to_string((int)pPostWinPosThread);
	char* cstr = new char[str.length() + 1];
	strcpy_s(cstr, str.length() + 1, str.c_str());
	return cstr;
}