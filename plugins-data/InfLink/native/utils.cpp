#include "pch.h"
#include <string>

class Utils {
public:
	static char* to_cstr_dyn(std::string str) {
		char* cstr = new char[str.length() + 1];
		strcpy_s(cstr, str.length() + 1, str.c_str());
		return cstr;
	}
};