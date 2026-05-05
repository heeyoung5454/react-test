import "./filter.css";

import { useState, useEffect, useMemo } from "react";

export default function FilterView({ data, onChange }) {
  const originData = data; // 원본 데이터
  const tree = useMemo(() => makeTree(originData), [originData]); // UI용 데이터

  const [openMap, setOpenMap] = useState({}); // open 상태 관리
  const [checkedMap, setCheckedMap] = useState({}); // checked 상태 관리

  const [searchValue, setSearchValue] = useState("");
  const normalizeSearch = (s) => (s ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedSearchValue = normalizeSearch(searchValue);
  const isSearching = normalizedSearchValue.length > 0;

  // 체크 여부
  const isChecked = (node) => {
    if (node.type === "name") {
      return !!checkedMap[node.policyId];
    }

    return node.children.every(isChecked);
  };

  //isIndeterminate (부분체크) 여부
  const isIndeterminate = (node) => {
    if (!node.children) return false;

    const checked = node.children.filter(isChecked).length;
    // 1개 이상 체크, 전체 체크 아닐 경우
    return checked > 0 && checked < node.children.length;
  };

  // 리프 노드 체크 상태 토글
  const handleCheckLeaf = (policyId) => {
    setCheckedMap((prev) => ({
      ...prev,
      [policyId]: !prev[policyId],
    }));
  };

  // 리프 노드가 아닌 노드 체크 변경
  const handleCheck = (node, checked) => {
    const newMap = { ...checkedMap };

    const dfs = (n) => {
      if (n.type === "name") {
        newMap[n.policyId] = checked;
        return;
      }
      n.children.forEach(dfs);
    };

    dfs(node);
    setCheckedMap(newMap);
  };

  // open 상태 토글
  const handleToggle = (key) => {
    setOpenMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filteredTree = useMemo(() => {
    const normalize = normalizeSearch;
    const keyword = normalizedSearchValue;
    if (!keyword) return tree;

    const filterNode = (node) => {
      // 마지막 노드(name)인 경우
      if (node.type === "name") {
        return normalize(node.label).includes(keyword) ? node : null;
      }

      const isMatch = normalize(node.label).includes(keyword);

      // 검색 노드 찾기
      if (isMatch) {
        return node;
      }
      // 하위 노드 필터링- null 아닌 값 찾기
      const children = node.children.map(filterNode).filter(Boolean);

      if (children.length > 0) {
        return { ...node, children };
      }

      return null;
    };

    return tree.map(filterNode).filter(Boolean);
  }, [tree, normalizedSearchValue]);

  const selectedCnt = Object.values(checkedMap).filter(Boolean).length;

  // 노드 식별용 키 생성 (main>sub>minor>name)
  const getKey = (...args) => {
    return args.join(">");
  };

  // 체크된 노드 태그로 생성
  const getTags = (nodes, path = []) => {
    const tags = [];

    nodes.forEach((node) => {
      // leaf 노드
      if (node.type === "name") {
        if (checkedMap[node.policyId]) {
          tags.push({
            label: [...path, node.label].join(" > "),
          });
        }
        return;
      }

      const allChecked = node.children.every(isChecked);

      if (allChecked) {
        tags.push({
          label: `${[...path, node.label].join(" > ")} : all (${node.leafCount})`,
        });
        return; // 여기서 하위 안 내려감 (중복 방지)
      }

      // 일부만 체크 - 내려감
      tags.push(...getTags(node.children, [...path, node.label]));
    });

    return tags;
  };

  const selectedTags = getTags(tree);

  // 체크 상태가 변할때만 호출
  useEffect(() => {
    const ids = Object.keys(checkedMap).filter((k) => checkedMap[k]);
    onChange?.(ids);
  }, [checkedMap, onChange]);

  useEffect(() => {
    if (!searchValue.trim()) {
      setOpenMap({});
      return;
    }

    const normalize = (s) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

    const keyword = normalize(searchValue);
    const newOpenMap = {};

    const markPath = (path) => {
      // main, sub, minor 모두 open 처리
      path.forEach((_, idx) => {
        const key = getKey(...path.slice(0, idx + 1));
        newOpenMap[key] = true;
      });
    };

    const dfs = (node, path = []) => {
      const currentPath = [...path, node.label];

      if (node.type === "name") {
        if (normalize(node.label).includes(keyword)) {
          markPath(currentPath);
        }
        return;
      }

      node.children.forEach((child) => dfs(child, currentPath));
    };

    tree.forEach((node) => dfs(node));

    setOpenMap(newOpenMap);
  }, [searchValue, tree]);

  // 트리 생성 (UI 표시 용)
  function makeTree(data) {
    const mainMap = new Map();

    const makeLeaf = (item) => ({
      label: item.name,
      type: "name",
      policyId: item.policyId,
      leafCount: 1,
    });

    data.forEach((item) => {
      const { main, sub, minor } = item;

      if (!mainMap.has(main)) {
        mainMap.set(main, {
          label: main,
          type: "main",
          children: [],
        });
      }

      const mainNode = mainMap.get(main);

      let subNode = mainNode.children.find((c) => c.label === sub);

      if (!subNode) {
        subNode = {
          label: sub,
          type: "sub",
          children: [],
        };
        mainNode.children.push(subNode);
      }

      let minorNode;

      if (minor) {
        minorNode = subNode.children.find((c) => c.label === minor);

        if (!minorNode) {
          minorNode = {
            label: minor,
            type: "minor",
            children: [],
          };
          subNode.children.push(minorNode);
        }

        minorNode.children.push(makeLeaf(item));
      } else {
        subNode.children.push(makeLeaf(item));
      }
    });

    // ⭐ leafCount immutable 계산
    const addCount = (node) => {
      if (node.type === "name") return 1;

      const sum = node.children.reduce((acc, c) => acc + addCount(c), 0);
      node.leafCount = sum;
      return sum;
    };

    const tree = Array.from(mainMap.values());

    tree.forEach(addCount);

    console.log(tree);

    return tree;
  }

  return (
    <div>
      <input className='search-input' value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />

      {filteredTree.map((main) => {
        const mainKey = getKey(main.label);
        const mainCheckboxId = `filter-main-${mainKey}`;
        const mainOpen = isSearching || !!openMap[mainKey];

        return (
          <div key={mainKey} className='main-filter-item'>
            {/* MAIN */}
            <div className='main-filter-title'>
              <span className='toggle-icon' onClick={() => handleToggle(mainKey)}>
                {mainOpen ? "▼" : "〉"}
              </span>

              <input
                id={mainCheckboxId}
                type='checkbox'
                checked={isChecked(main)}
                ref={(el) => {
                  if (!el) return;
                  el.indeterminate = isIndeterminate(main);
                }}
                onChange={(e) => handleCheck(main, e.target.checked)}
              />

              <label htmlFor={mainCheckboxId}>
                {main.label} ({main.leafCount})
              </label>
            </div>

            {/* SUB */}
            {mainOpen && (
              <ul className='sub-filter-list'>
                {main.children.map((sub) => {
                  const subKey = getKey(main.label, sub.label);
                  const subCheckboxId = `filter-sub-${subKey}`;
                  const subOpen = isSearching || !!openMap[subKey];

                  return (
                    <li key={subKey} className='sub-filter-item'>
                      <div className='sub-filter-title'>
                        <span className='toggle-icon' onClick={() => handleToggle(subKey)}>
                          {subOpen ? "▼" : "〉"}
                        </span>

                        <input
                          id={subCheckboxId}
                          type='checkbox'
                          checked={isChecked(sub)}
                          ref={(el) => {
                            if (!el) return;
                            el.indeterminate = isIndeterminate(sub);
                          }}
                          onChange={(e) => handleCheck(sub, e.target.checked)}
                        />

                        <label htmlFor={subCheckboxId}>
                          {sub.label} ({sub.leafCount})
                        </label>
                      </div>

                      {/* MINOR or NAME */}
                      {subOpen && (
                        <ul className='minor-filter-list'>
                          {sub.children.map((minor) => {
                            // leaf (sub 아래 바로 name)
                            if (minor.type === "name") {
                              const leafCheckboxId = `filter-leaf-${minor.policyId}`;
                              return (
                                <li key={minor.policyId} className='final-filter-item'>
                                  <div className='dot-icon'>
                                    <input id={leafCheckboxId} type='checkbox' checked={!!checkedMap[minor.policyId]} onChange={() => handleCheckLeaf(minor.policyId)} />
                                    <label htmlFor={leafCheckboxId}>{minor.label}</label>
                                  </div>
                                </li>
                              );
                            }

                            const minorKey = getKey(main.label, sub.label, minor.label);
                            const minorCheckboxId = `filter-minor-${minorKey}`;
                            const minorOpen = isSearching || !!openMap[minorKey];

                            return (
                              <li key={minorKey} className='minor-filter-item'>
                                <div className='minor-filter-title'>
                                  <span className='toggle-icon' onClick={() => handleToggle(minorKey)}>
                                    {minorOpen ? "▼" : "〉"}
                                  </span>

                                  <input
                                    id={minorCheckboxId}
                                    type='checkbox'
                                    checked={isChecked(minor)}
                                    ref={(el) => {
                                      if (!el) return;
                                      el.indeterminate = isIndeterminate(minor);
                                    }}
                                    onChange={(e) => handleCheck(minor, e.target.checked)}
                                  />

                                  <label htmlFor={minorCheckboxId}>
                                    {minor.label} ({minor.children?.length})
                                  </label>
                                </div>

                                {/* FINAL */}
                                {minorOpen && (
                                  <div className='final-filter-item'>
                                    {minor.children.map((final) => {
                                      const finalCheckboxId = `filter-final-${final.policyId}`;
                                      return (
                                        <div key={final.policyId} className='dot-icon'>
                                          <input id={finalCheckboxId} type='checkbox' checked={!!checkedMap[final.policyId]} onChange={() => handleCheckLeaf(final.policyId)} />
                                          <label htmlFor={finalCheckboxId}>{final.label}</label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      <div className='selected-options-wrapper'>
        <div className='selected-title'>선택된 옵션</div>
        <div className='tag-summary'>
          {" "}
          {selectedCnt} / {originData.length} selected
        </div>

        <div className='tag-list-wrapper'>
          {selectedTags.map((tag, i) => (
            <div key={i} className='tag-item'>
              {tag.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
