import TableView from "./components/table";
import FilterView from "./components/filter";
import { field, testData } from "./data/test";
import "./App.css";

function App() {
  return (
    <div className='App'>
      <div className='filter-wrapper'>
        <FilterView data={testData} />
      </div>
      <div className='table-wrapper'>
        <TableView field={field} data={testData} />
      </div>
    </div>
  );
}

export default App;
