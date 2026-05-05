import TableView from "./components/table";
import FilterView from "./components/filter";
import { field, testData } from "./data/test";
import "./App.css";

import { useState, useCallback } from "react";

function App() {
  // 로컬스토리지 키 (상태 유지용)
  const FILTER_STORAGE_KEY = "saveSelectedPolicyIds";

  // localStorage 기반 선택 상태 복원
  const [checkedPolicyIds, setCheckedPolicyIds] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // 선택 상태 기반 테이블 초기 데이터 계산
  const [tableData, setTableData] = useState(() => {
    if (!checkedPolicyIds.length) return testData;
    return testData.filter((item) => checkedPolicyIds.includes(item.policyId));
  });

  // Filter 선택 변경 처리 및 localStorage 저장
  const handleFilterChange = useCallback((checkedPolicyIds) => {
    setCheckedPolicyIds(checkedPolicyIds);
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(checkedPolicyIds));
    } catch {
      console.error("localStorage 오류");
    }

    const filtered = testData.filter((item) => checkedPolicyIds.includes(item.policyId));

    setTableData(filtered);
  }, []);

  return (
    <div className='App'>
      <div className='filter-wrapper'>
        <FilterView data={testData} defaultCheckedIds={checkedPolicyIds} onChange={handleFilterChange} />
      </div>
      <div className='table-wrapper'>
        <TableView field={field} data={tableData} />
      </div>
    </div>
  );
}

export default App;
