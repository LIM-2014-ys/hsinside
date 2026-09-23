{/* 비밀번호 입력 칸 */}
<div>
  <label className="block text-sm font-medium text-gray-700">비밀번호</label>
  <input
    type="password"
    value={password}
    onChange={(e) => {
      setPassword(e.target.value);
      setPasswordError('');
    }}
    placeholder="8자 이상, 영문+숫자+특수문자 조합"
    className={`mt-1 block w-full px-3 py-2 border ${
      passwordError ? 'border-red-500' : 'border-gray-300'
    } rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
  />

  {/* 부드럽게 연결되어 늘어나는 연속 게이지 바 */}
  {password.length > 0 && (
    <div className="mt-2 space-y-1">
      {/* 배경 트랙 */}
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        {/* 채워지는 게이지 바 */}
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${
            strength === 4 ? 'bg-green-500' :
            strength === 3 ? 'bg-yellow-500' :
            strength === 2 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${(strength / 4) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 pt-0.5">
        <span>
          보안 강도:{' '}
          {strength === 4 ? (
            <strong className="text-green-600 font-bold">강력 (가입 가능)</strong>
          ) : strength === 3 ? (
            <span className="text-yellow-600 font-semibold">양호</span>
          ) : strength === 2 ? (
            <span className="text-orange-600 font-semibold">보통</span>
          ) : (
            <span className="text-red-500 font-semibold">약함</span>
          )}
        </span>
        <span>8자+ / 영문 / 숫자 / 특수문자</span>
      </div>
    </div>
  )}
</div>
