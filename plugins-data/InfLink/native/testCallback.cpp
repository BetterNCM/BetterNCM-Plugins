#include "pch.h"
#include <include/capi/cef_task_capi.h>
#include <include/capi/cef_v8_capi.h>
#include <thread>
#include "InfLink.h"
#include "utils.cpp"

char* testApi(void** args) {
	return Utils::to_cstr_dyn(std::string("true"));
}