import "./filter.css";

import { useState, useEffect } from "react";

export default function FilterView({ data, onChange }) {
  const [treeData, setTreeData] = useState(makeTree(data));

  const [selectedCnt, setSelectedCnt] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);

  const totalCnt = data.length;

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

  // 체크박스 선택/해제 (토글)
  const handleCheck = (type, mainIndex, subIndex, minorIndex, finalIndex, checked) => {
    // 대분류 선택
    if (type === "main") {
      setTreeData((items) => {
        return items.map((main, i) => {
          if (i !== mainIndex) return main;

          const nextIsChecked = checked ?? !main.isChecked;

          return {
            ...main,
            isChecked: nextIsChecked,

            children: main.children.map((sub) => {
              return {
                ...sub,
                isChecked: nextIsChecked,
                children: sub.children.map((minor) => {
                  return {
                    ...minor,
                    isChecked: nextIsChecked,
                    // minor.childen이 존재할 경우
                    children: minor.children?.map((final) => {
                      return {
                        ...final,
                        isChecked: nextIsChecked,
                      };
                    }),
                  };
                }),
              };
            }),
          };
        });
      });
      return;
    }

    // 중분류 선택
    if (type === "sub") {
      setTreeData((items) =>
        items.map((main, i) => {
          if (i !== mainIndex) return main;

          // 1. sub 체크
          const updatedSubs = main.children.map((sub, j) => {
            if (j !== subIndex) return sub;

            const nextIsChecked = checked ?? !sub.isChecked;

            return {
              ...sub,
              isChecked: nextIsChecked,
              children: sub.children.map((minor) => ({
                ...minor,
                isChecked: nextIsChecked,
                // minor.childen이 존재할 경우
                children: minor.children?.map((final) => {
                  return {
                    ...final,
                    isChecked: nextIsChecked,
                  };
                }),
              })),
            };
          });

          // 2. main 체크
          const mainAllChecked = updatedSubs.every((sub) => sub.isChecked);

          return {
            ...main,
            isChecked: mainAllChecked,
            children: updatedSubs,
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

          // 1. sub 체크
          const updatedSubs = main.children.map((sub, j) => {
            if (j !== subIndex) return sub;

            // 1-1. minor 체크
            const updatedMinors = sub.children.map((minor, k) => {
              if (k !== minorIndex) return minor;

              const nextIsChecked = checked ?? !minor.isChecked;

              return {
                ...minor,
                isChecked: nextIsChecked,
                // minor.childen이 존재할 경우
                children: minor.children?.map((final) => {
                  return {
                    ...final,
                    isChecked: nextIsChecked,
                  };
                }),
              };
            });

            // 1-2. sub 체크
            const subAllChecked = updatedMinors.every((minor) => minor.isChecked);

            return {
              ...sub,
              isChecked: subAllChecked,
              children: updatedMinors,
            };
          });

          // 2. main 체크
          const mainAllChecked = updatedSubs.every((sub) => sub.isChecked);

          return {
            ...main,
            isChecked: mainAllChecked,
            children: updatedSubs,
          };
        })
      );
      return;
    }

    if (type === "final") {
      setTreeData((items) =>
        items.map((main, i) => {
          if (i !== mainIndex) return main;

          const updatedSubs = main.children.map((sub, j) => {
            if (j !== subIndex) return sub;

            const updatedMinors = sub.children.map((minor, k) => {
              if (k !== minorIndex) return minor;

              const updatedFinals = minor.children.map((final, l) => {
                if (l !== finalIndex) return final;

                const nextIsChecked = checked ?? !final.isChecked;

                return { ...final, isChecked: nextIsChecked };
              });

              // minor 체크
              const minorAllChecked = updatedFinals.every((final) => final.isChecked);

              return {
                ...minor,
                children: updatedFinals,
                isChecked: minorAllChecked,
              };
            });

            // sub 체크
            const subAllChecked = updatedMinors.every((m) => m.isChecked);

            return {
              ...sub,
              children: updatedMinors,
              isChecked: subAllChecked,
            };
          });

          // main 체크
          const mainAllChecked = updatedSubs.every((sub) => sub.isChecked);

          return {
            ...main,
            children: updatedSubs,
            isChecked: mainAllChecked,
          };
        })
      );
      return;
    }
  };

  // 선택된 옵션 삭제 (=체크박스 해제)
  const handleRemoveItem = (index) => {
    if (index.finalIndex !== undefined) {
      handleCheck("final", index.mainIndex, index.subIndex, index.minorIndex, index.finalIndex);
      return;
    }

    if (index.minorIndex !== undefined) {
      handleCheck("minor", index.mainIndex, index.subIndex, index.minorIndex);
      return;
    }

    if (index.subIndex !== undefined) {
      handleCheck("sub", index.mainIndex, index.subIndex);
      return;
    }

    if (index.mainIndex !== undefined) {
      handleCheck("main", index.mainIndex);
      return;
    }
  };

  // 하위 값이 모두 체크되어있는지 확인
  function isAllChecked(nodes) {
    return nodes.every((n) => {
      if (n.children) {
        return isAllChecked(n.children);
      }
      return n.isChecked;
    });
  }

  useEffect(() => {
    // useEffect 안에서만 쓰는 함수는 안으로 넣는다 (컴포넌트 내부 함수라서 렌더링마다 새로 생성됨)
    const getCheckedPolicyIds = (tree) => {
      let result = [];

      tree.forEach((node) => {
        if (node.type === "name" && node.isChecked) {
          result.push(node.policyId);
        }

        if (node.children) {
          result = result.concat(getCheckedPolicyIds(node.children));
        }
      });

      return result;
    };

    const getSelectedTags = (tree) => {
      const tags = [];

      tree.forEach((main, mainIndex) => {
        const mainAllChecked = isAllChecked(main.children);

        if (mainAllChecked) {
          tags.push({
            label: `${main.label} : all(${main.children.length})`,
            key: main.label,
            index: { mainIndex: mainIndex },
          });
          return;
        }

        main.children.forEach((sub, subIndex) => {
          const subAllChecked = isAllChecked(sub.children);

          if (subAllChecked) {
            tags.push({
              label: `${main.label} > ${sub.label} : all(${sub.children.length})`,
              key: `${main.label}-${sub.label}`,
              index: { mainIndex, subIndex },
            });
            return;
          }

          sub.children.forEach((minor, minorIndex) => {
            // name 타입이면 바로 leaf
            if (minor.type === "name") {
              if (minor.isChecked) {
                tags.push({
                  label: `${main.label} > ${sub.label} > ${minor.label} (1)`,
                  key: `${main.label}-${sub.label}-${minor.label}-${minor.policyId}`,
                  index: { mainIndex, subIndex, minorIndex },
                });
              }
              return;
            }

            const minorAllChecked = isAllChecked(minor.children);

            if (minorAllChecked) {
              tags.push({
                label: `${main.label} > ${sub.label} > ${minor.label} : all(${minor.children.length})`,
                key: `${main.label}-${sub.label}-${minor.label}`,
                index: { mainIndex, subIndex, minorIndex },
              });
              return;
            }

            // 일부 선택 final까지 내려감
            minor.children.forEach((final, finalIndex) => {
              if (final.isChecked) {
                tags.push({
                  label: `${main.label} > ${sub.label} > ${minor.label} > ${final.label}`,
                  key: `${main.label}-${sub.label}-${minor.label}-${final.label}`,
                  index: { mainIndex, subIndex, minorIndex, finalIndex },
                });
              }
            });
          });
        });
      });

      return tags;
    };

    // 선택된 옵션 ID 리스트 만들기
    const ids = getCheckedPolicyIds(treeData);
    onChange?.(ids);
    setSelectedCnt(ids.length);

    // 선택된 옵션 태그 리스트 만들기
    const tags = getSelectedTags(treeData);
    setSelectedOptions(tags);
  }, [treeData, onChange]);

  return (
    <div>
      <div>
        {treeData.map((mainItem, mainIndex) => (
          <div className='main-filter-item' key={mainItem.label}>
            {/* s : 대분류 */}
            <div className='main-filter-title'>
              <span className='toggle-icon' onClick={() => handleOpen("main", mainIndex)}>
                {mainItem.isOpen ? "▼" : "〉"}
              </span>
              <input
                type='checkbox'
                checked={mainItem.children.every((sub) => sub.isChecked)}
                id={mainItem.label}
                ref={(el) => {
                  if (!el) return;

                  const allChecked = mainItem.children.every((sub) => sub.isChecked);
                  const someChecked = mainItem.children.some((sub) => sub.isChecked);

                  el.indeterminate = someChecked && !allChecked;
                }}
                onChange={() => handleCheck("main", mainIndex)}
              />
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
                      <input
                        type='checkbox'
                        checked={subItem.children.every((minor) => minor.isChecked)}
                        id={`${mainItem.label}-${subItem.label}`}
                        ref={(el) => {
                          if (!el) return;

                          const allChecked = subItem.children.every((minor) => minor.isChecked);
                          const someChecked = subItem.children.some((minor) => minor.isChecked);

                          el.indeterminate = someChecked && !allChecked;
                        }}
                        onChange={() => handleCheck("sub", mainIndex, subIndex)}
                      />
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
                                ref={(el) => {
                                  if (!el) return;

                                  if (minorItem.type !== "name" && minorItem.children?.length > 0) {
                                    const allChecked = minorItem.children.every((final) => final.isChecked);
                                    const someChecked = minorItem.children.some((final) => final.isChecked);

                                    el.indeterminate = someChecked && !allChecked;
                                  } else {
                                    el.indeterminate = false;
                                  }
                                }}
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

      <div className='selected-options-wrapper'>
        <div className='selected-title'>선택된 옵션</div>
        <div className='tag-summary'>
          {selectedCnt} / {totalCnt} selected
        </div>

        <div className='tag-list-wrapper'>
          {selectedOptions.map((option) => (
            <div className='tag-item' key={option.key}>
              <span className='tag-item-label'>{option.label}</span>
              <span className='tag-item-icon' onClick={() => handleRemoveItem(option.index)}>
                ×
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
