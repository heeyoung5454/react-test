import "./filter.css";

import { useState, useEffect, useMemo } from "react";

export default function FilterView({ data, onChange }) {
  const originData = data; // 원본데이터
  const tree = useMemo(() => makeTree(originData), [originData]);

  // 트리 노드 펼침/접힘 상태: key(main>sub>minor) -> boolean
  const [openMap, setOpenMap] = useState({});
  // leaf 체크 상태: policyId -> boolean
  const [checkedMap, setCheckedMap] = useState({});

  // 검색어 원본/정규화 문자열 분리
  // - 공백 여러 개 → 1개, 양끝 공백 제거, 소문자 통일
  const [searchValue, setSearchValue] = useState("");
  const normalizeSearch = (s) => (s ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedSearchValue = normalizeSearch(searchValue);
  const isSearching = normalizedSearchValue.length > 0;

  // 검색 키워드 공백 분리
  const searchKeywords = useMemo(() => normalizedSearchValue.split(" ").filter(Boolean), [normalizedSearchValue]);

  // 하이라이트 (regex 없음)
  const highlightLabel = (label) => {
    if (!isSearching || searchKeywords.length === 0) return label;

    const text = String(label);
    const lowerText = text.toLowerCase();

    const result = [];
    let lastIndex = 0;

    // 모든 토큰 매칭 위치 수집
    const matches = [];

    searchKeywords.forEach((kw) => {
      const keyword = kw.toLowerCase();
      let idx = lowerText.indexOf(keyword);

      while (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + keyword.length,
        });

        idx = lowerText.indexOf(keyword, idx + 1);
      }
    });

    // start 기준 정렬 + 겹침 제거
    matches.sort((a, b) => a.start - b.start);

    let merged = [];
    matches.forEach((m) => {
      const last = merged[merged.length - 1];

      if (!last || m.start > last.end) {
        merged.push(m);
      } else {
        last.end = Math.max(last.end, m.end);
      }
    });

    // 문자열 쪼개서 JSX 생성
    merged.forEach((m, i) => {
      if (lastIndex < m.start) {
        result.push(<span key={`t-${i}-n`}>{text.slice(lastIndex, m.start)}</span>);
      }

      // 클래스 지정 후 하이라이트 처리
      result.push(
        <span key={`t-${i}-h`} className='search-highlight'>
          {text.slice(m.start, m.end)}
        </span>
      );

      lastIndex = m.end;
    });

    if (lastIndex < text.length) {
      result.push(<span key='last'>{text.slice(lastIndex)}</span>);
    }

    return result;
  };

  // 노드 전체 체크 여부
  // - leaf(name): checkedMap 기준
  // - 비-leaf: 자식이 전부 체크되어야 true
  const isChecked = (node) => {
    if (node.type === "name") {
      return !!checkedMap[node.policyId];
    }

    return node.children.every(isChecked);
  };

  // 부분 체크(indeterminate) 여부
  // 자식 중 일부만 체크된 상태이면 true (checkbox의 indeterminate UI)
  const isIndeterminate = (node) => {
    if (!node.children) return false;

    const checked = node.children.filter(isChecked).length;
    // 1개 이상 체크, 전체 체크 아닐 경우
    return checked > 0 && checked < node.children.length;
  };

  // leaf(name) 단일 토글
  const handleCheckLeaf = (policyId) => {
    setCheckedMap((prev) => ({
      ...prev,
      [policyId]: !prev[policyId],
    }));
  };

  // 그룹(main/sub/minor) 체크 변경 및 하위 leaf까지 체크 전파
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

  // key(main>sub>minor) 단위 open 상태 토글
  const handleToggle = (key) => {
    setOpenMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 검색어 기반 트리 필터링 버전 계산
  // - leaf: label.includes(keyword)면 통과
  // - 중간 노드(main/sub/minor): label 매칭 시 하위 전체 노출
  // - 그 외: 자식 중 통과 노드만 남겨 노출
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

      // 중간 노드 label 매칭 시 하위 전체 노출
      if (isMatch) {
        return node;
      }
      // 하위 매칭 노드만 남김
      const children = node.children.map(filterNode).filter(Boolean);

      if (children.length > 0) {
        return { ...node, children };
      }

      return null;
    };

    return tree.map(filterNode).filter(Boolean);
  }, [tree, normalizedSearchValue]);

  // 현재 체크된 leaf 개수(하단 summary 표시용)
  const selectedCnt = Object.values(checkedMap).filter(Boolean).length;

  // openMap 키: 라벨 기반 경로 "main>sub>minor" 형태 처리
  const getKey = (...args) => {
    return args.join(">");
  };

  // 하단 "선택된 옵션" 태그 만들기:
  // - leaf 체크는 개별 태그로
  // - 그룹 노드가 "전체 체크"면 하위 leaf들을 묶어서 all(...) 태그로 (중복 노출 방지)
  const getTags = (nodes, path = []) => {
    const tags = [];

    // 그룹 노드 하위의 leaf policyId를 전부 수집합니다.
    const getLeafPolicyIds = (n) => {
      if (n.type === "name") return [n.policyId];
      return n.children.flatMap(getLeafPolicyIds);
    };

    nodes.forEach((node) => {
      // leaf 노드
      if (node.type === "name") {
        if (checkedMap[node.policyId]) {
          tags.push({
            label: [...path, node.label].join(" > "),
            policyIds: [node.policyId],
          });
        }
        return;
      }

      const allChecked = node.children.every(isChecked);

      if (allChecked) {
        // all 태그는 "해당 그룹 하위 leaf 전체"를 대표하므로,
        // 삭제(X) 클릭 시 하위 leaf를 한 번에 해제할 수 있도록 policyIds를 담습니다.
        const policyIds = getLeafPolicyIds(node).filter((id) => checkedMap[id]);
        tags.push({
          label: `${[...path, node.label].join(" > ")} : all (${node.leafCount})`,
          policyIds,
        });
        return; // 여기서 하위 안 내려감 (중복 방지)
      }

      // 일부만 체크 - 내려감
      tags.push(...getTags(node.children, [...path, node.label]));
    });

    return tags;
  };

  // 렌더 시 checkedMap 기준 태그 계산
  const selectedTags = getTags(tree);

  // 태그 X 클릭 시 대표 policyId 해제 처리
  const handleRemoveTag = (policyIds) => {
    setCheckedMap((prev) => {
      const next = { ...prev };
      policyIds.forEach((id) => {
        next[id] = false;
      });
      return next;
    });
  };

  // 외부(App)로 체크된 policyId 리스트 전달
  useEffect(() => {
    const ids = Object.keys(checkedMap).filter((k) => checkedMap[k]);
    onChange?.(ids);
  }, [checkedMap, onChange]);

  // 검색 결과 노출용 자동 open 처리
  // - 검색어 매칭 leaf의 경로(main/sub/minor)를 openMap에 자동 표시
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

  // 트리 구조로 데이터 변환
  function makeTree(data) {
    const mainMap = new Map();

    // leaf 노드 생성 (name/label + policyId, leafCount=1 시작)
    const makeLeaf = (item) => ({
      label: item.name,
      type: "name",
      policyId: item.policyId,
      leafCount: 1,
    });

    data.forEach((item) => {
      const { main, sub, minor } = item;

      // main 노드 생성/조회
      if (!mainMap.has(main)) {
        mainMap.set(main, {
          label: main,
          type: "main",
          children: [],
        });
      }

      const mainNode = mainMap.get(main);

      // sub 노드 생성/조회
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

      // minor 유무에 따른 leaf 연결 위치 결정 (minor 하위 또는 sub 직하)
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

    // 각 그룹 노드 leafCount(하위 leaf 개수) 계산
    const addCount = (node) => {
      if (node.type === "name") return 1;

      const sum = node.children.reduce((acc, c) => acc + addCount(c), 0);
      node.leafCount = sum;
      return sum;
    };

    const tree = Array.from(mainMap.values());

    tree.forEach(addCount);

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
                {highlightLabel(main.label)} ({main.leafCount})
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
                          {highlightLabel(sub.label)} ({sub.leafCount})
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
                                    <label htmlFor={leafCheckboxId}>{highlightLabel(minor.label)}</label>
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
                                    {highlightLabel(minor.label)} ({minor.children?.length})
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
                                          <label htmlFor={finalCheckboxId}>{highlightLabel(final.label)}</label>
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
              <span className='tag-item-icon' role='button' tabIndex={0} onClick={() => handleRemoveTag(tag.policyIds)}>
                ×
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
