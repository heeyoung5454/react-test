import TableView from "./components/table";
import FilterView from "./components/filter";
import { field, testData } from "./data/test";
import "./App.css";

import { useState, useCallback } from "react";

function App() {
  const [tableData, setTableData] = useState(testData);


  // Filter에서 선택된 policyId 받기
  const handleFilterChange = useCallback((checkedPolicyIds) => {
    const filtered = testData.filter(item =>
      checkedPolicyIds.includes(item.policyId)
    );

    setTableData(filtered);
  }, []);


  return (
    <div className='App'>
      <div className='filter-wrapper'>
        <FilterView data={testData} onChange={handleFilterChange} />
      </div>
      <div className='table-wrapper'>
        <TableView field={field} data={tableData} />
      </div>
    </div>
  );
}

export default App;
