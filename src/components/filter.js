import "./filter.css";

import { useState, useEffect } from "react";

export default function FilterView({ data }) {
  const [treeData, setTreeData] = useState(makeTree(data));

  function makeTree(data) {
    const mainMap = new Map();

    data.forEach((item) => {
      const { main, sub, minor, name, policyId } = item;

      // 1. 대분류
      if (!mainMap.has(main)) {
        mainMap.set(main, {
          label: main,
          children: [],
          subMap: new Map(),
        });
      }

      const mainNode = mainMap.get(main);

      // 2. 중분류
      if (!mainNode.subMap.has(sub)) {
        mainNode.subMap.set(sub, {
          label: sub,
          children: [],
          minorMap: new Map(),
        });
        mainNode.children.push(mainNode.subMap.get(sub));
      }

      const subNode = mainNode.subMap.get(sub);

      // 3. 소분류 (있을 때만)
      if (minor) {
        if (!subNode.minorMap.has(minor)) {
          subNode.minorMap.set(minor, {
            label: minor,
            children: [],
            isOpen: false,
            isChecked: false,
          });
          subNode.children.push(subNode.minorMap.get(minor));
        }

        // 소분류에 항목(name)
        subNode.minorMap.get(minor).children.push({
          label: name,
          type: "name",
          policyId,
          isChecked: false,
        });
      } else {
        // 소분류 없으면 바로 name 추가
        subNode.children.push({
          type: "name",
          label: name,
          policyId,
          isChecked: false,
        });
      }
    });

    // 내부 Map 제거 (UI용으로 정리)
    return Array.from(mainMap.values()).map((main) => ({
      label: main.label,
      isOpen: false,
      isChecked: false,
      children: main.children.map((sub) => ({
        label: sub.label,
        isChecked: false,
        children: sub.children,
        isOpen: false,
      })),
    }));
  }

  // 토글 on/off
  const handleOpen = (type, mainIndex, subIndex, minorIndex) => {
    // 대분류 토글
    if (type === "main") {
      setTreeData((items) => {
        return items.map((main, i) => (i === mainIndex ? { ...main, isOpen: !main.isOpen } : main));
      });
      return;
    }

    // 중분류 토글
    if (type === "sub") {
      setTreeData((items) => {
        return items.map((main, i) => {
          if (i !== mainIndex) return main;

          return {
            ...main,
            children: main.children.map((sub, j) => (j === subIndex ? { ...sub, isOpen: !sub.isOpen } : sub)),
          };
        });
      });
      return;
    }

    // 소분류 토글
    if (type === "minor") {
      setTreeData((items) => {
        return items.map((main, i) => {
          if (i !== mainIndex) return main;

          return {
            ...main,
            children: main.children.map((sub, j) => {
              if (j !== subIndex) return sub;

              return {
                ...sub,
                children: sub.children.map((minor, k) => (k === minorIndex ? { ...minor, isOpen: !minor.isOpen } : minor)),
              };
            }),
          };
        });
      });
      return;
    }
  };

  // 체크박스 선택/해제
  const handleCheck = (type, mainIndex, subIndex, minorIndex, finalIndex) => {
    // 대분류 선택
    if (type === "main") {
      setTreeData((items) => items.map((main, i) => (i === mainIndex ? { ...main, isChecked: !main.isChecked } : main)));
      return;
    }

    // 중분류 선택
    if (type === "sub") {
      setTreeData((items) =>
        items.map((main, i) => {
          if (i !== mainIndex) return main;

          return {
            ...main,
            children: main.children.map((sub, j) => (j === subIndex ? { ...sub, isChecked: !sub.isChecked } : sub)),
          };
        })
      );
      return;
    }

    // 소분류 선택
    if (type === "minor") {
      setTreeData((items) =>
        items.map((main, i) => {
          if (i !== mainIndex) return main;

          return {
            ...main,
            children: main.children.map((sub, j) => {
              if (j !== subIndex) return sub;

              return {
                ...sub,
                children: sub.children.map((minor, k) => (k === minorIndex ? { ...minor, isChecked: !minor.isChecked } : minor)),
              };
            }),
          };
        })
      );
      return;
    }

    if (type === "final") {
      setTreeData((items) =>
        items.map((main, i) => {
          if (i !== mainIndex) return main;

          return {
            ...main,
            children: main.children.map((sub, j) => {
              if (j !== subIndex) return sub;

              return {
                ...sub,
                children: sub.children.map((minor, k) => {
                  if (k !== minorIndex) return minor;

                  return {
                    ...minor,
                    children: minor.children.map((final, l) => (l === finalIndex ? { ...final, isChecked: !final.isChecked } : final)),
                  };
                }),
              };
            }),
          };
        })
      );
      return;
    }
  };

  useEffect(() => {
    setTreeData(makeTree(data));
  }, [data]);

  return (
    <div>
      {treeData.map((mainItem, mainIndex) => (
        <div className='main-filter-item' key={mainItem.label}>
          {/* s : 대분류 */}
          <div className='main-filter-title'>
            <span className='toggle-icon' onClick={() => handleOpen("main", mainIndex)}>
              {mainItem.isOpen ? "▼" : "〉"}
            </span>
            <input type='checkbox' value={mainItem.isChecked} id={mainItem.label} onChange={() => handleCheck("main", mainIndex)} />
            <label htmlFor={mainItem.label}>
              {mainItem.label} ({mainItem.children.length})
            </label>
          </div>
          {/* e : 대분류 */}

          {/* s : 중분류 */}
          <div className='sub-filter-list'>
            {mainItem.isOpen &&
              mainItem.children.map((subItem, subIndex) => (
                <div className='sub-filter-item' key={`${mainItem.label}-${subItem.label}`}>
                  <div className='sub-filter-title'>
                    <input type='checkbox' checked={subItem.isChecked} id={`${mainItem.label}-${subItem.label}`} onChange={() => handleCheck("sub", mainIndex, subIndex)} />
                    <label htmlFor={`${mainItem.label}-${subItem.label}`}>
                      {subItem.label} ({subItem.children.length})
                    </label>
                    <span className='toggle-icon' onClick={() => handleOpen("sub", mainIndex, subIndex)}>
                      {subItem.isOpen ? "▼" : "〉"}
                    </span>
                  </div>

                  {/* s : 소분류 (없을때는 name 출력, 있을때는 소분류 출력) */}
                  <div className='minor-filter-list'>
                    {subItem.isOpen &&
                      subItem.children.map((minorItem, minorIndex) => (
                        <div className='minor-filter-item' key={`${mainItem.label}-${subItem.label}-${minorItem.label}`}>
                          <div className={`minor-filter-title ${minorItem?.type === "name" ? "dot-icon" : ""}`}>
                            {minorItem?.type !== "name" && (
                              <span
                                className='toggle-icon'
                                onClick={() => {
                                  if (minorItem?.type === "name") return;
                                  handleOpen("minor", mainIndex, subIndex, minorIndex);
                                }}
                              >
                                {minorItem.isOpen ? "▼" : "〉"}
                              </span>
                            )}

                            <input
                              type='checkbox'
                              checked={minorItem.isChecked}
                              id={`${mainItem.label}-${subItem.label}-${minorItem.label}`}
                              onChange={() => {
                                handleCheck("minor", mainIndex, subIndex, minorIndex);
                              }}
                            />
                            <label htmlFor={`${mainItem.label}-${subItem.label}-${minorItem.label}`}>
                              {minorItem.label} {minorItem.type === "name" ? "" : `(${minorItem.children?.length})`}
                            </label>
                          </div>

                          {/* s: name (소분류-name 있을 때만 출력) */}
                          {minorItem.isOpen &&
                            minorItem.children &&
                            minorItem.children.map((finalItem, finalIndex) => (
                              <div className='final-filter-item' key={`${mainItem.label}-${subItem.label}-${minorItem.label}-${finalItem.label}`}>
                                <div className='final-filter-title dot-icon'>
                                  <input
                                    type='checkbox'
                                    checked={finalItem.isChecked}
                                    id={`${mainItem.label}-${subItem.label}-${minorItem.label}-${finalItem.label}`}
                                    onChange={() => handleCheck("final", mainIndex, subIndex, minorIndex, finalIndex)}
                                  />
                                  <label htmlFor={`${mainItem.label}-${subItem.label}-${minorItem.label}-${finalItem.label}`}>{finalItem.label}</label>
                                </div>
                              </div>
                            ))}
                          {/* e: name */}
                        </div>
                      ))}
                  </div>
                  {/* e : 소분류 */}
                </div>
              ))}
          </div>
          {/* e : 중분류 */}
        </div>
      ))}
    </div>
  );
}
