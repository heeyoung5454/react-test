import "./table.css";

export default function TableView({ field, data }) {
  return (
    <div>
      <table>
        <thead>
          <tr>
            {field.map((item) => (
              <th className='table-header' key={item.label}>
                {item.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.policyId}>
              <td className='table-data'>{item.policyId}</td>
              <td className='table-data'>{item.main}</td>
              <td className='table-data'>{item.sub}</td>
              <td className='table-data'>{item.minor}</td>
              <td className='table-data'>{item.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
