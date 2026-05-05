# react-test

## 1. 프로젝트 실행방법

```bash
npm install
npm start
```

## 2. 전체 구조 및 동작 방식 설명

- **진입 파일**: `src/index.js` → `src/App.js` 렌더링
- **데이터 소스**: `src/data/test.js`
  - `testData`: 정책 목록(flat array)
  - `field`: 테이블 컬럼 정의
- **화면 구성**: `src/App.js`
  - `FilterView`(`src/components/filter.js`)에서 선택된 `policyId` 목록 수신
  - `TableView`(`src/components/table.js`)에 필터링된 데이터 전달
- **핵심 데이터 흐름**
  - `FilterView` 체크 변경 → `onChange(checkedPolicyIds)` 호출
  - `App`에서 `checkedPolicyIds`를 기반으로 `testData`를 필터링 → `tableData` 갱신

## 3. Tree 구조 및 상태 관리 방식 설명

- **Tree 변환 로직**: `src/components/filter.js`의 `makeTree(data)`
  - 원본 데이터를 `main > sub > (minor) > name(leaf)` 구조로 그룹핑
    - `minor` 값이 없으면 `sub` 아래에 `name(leaf)`가 바로 연결되는 구조
  - 각 노드에 `leafCount`(하위 leaf 개수) 계산값 부여
- **상태 분리**
  - **open 상태**: `openMap` (key: `"main>sub>minor"`, value: boolean)
  - **check 상태**: `checkedMap` (key: `policyId`, value: boolean)
- **키 생성 방식**
  - `getKey(...labels)`로 `"main>sub>minor"` 형태 직렬화

## 4. 필터 선택/해제 동기화 로직 설명

- **체크 상태 계산**
  - `isChecked(node)`: leaf는 `checkedMap`, 그룹 노드는 자식 전체 체크 여부 기준
  - `isIndeterminate(node)`: 그룹 노드의 부분 체크 UI 상태 계산
- **체크 전파**
  - leaf: `handleCheckLeaf(policyId)`로 단일 토글
  - 그룹(main/sub/minor): `handleCheck(node, checked)`로 하위 leaf까지 일괄 체크/해제
- **선택 태그 생성**
  - `getTags(tree)`로 하단 태그 리스트 생성
  - leaf는 개별 태그, 그룹이 전체 체크면 `all(...)` 태그로 묶음 처리
- **태그 X 클릭 동작**
  - `handleRemoveTag(policyIds)`로 해당 태그가 대표하는 leaf들을 해제 처리

## 5. 테스트 수행 내용 및 Test case 정의

### 테스트 실행

```bash
npm test -- --watchAll=false
```

### 포함된 테스트(`src/App.test.js`)

- `src/App.test.js`는 AI로 작성된 테스트 코드입니다

- **렌더링 기본 요소 확인**
  - 검색 input(`role="textbox"`) 존재
  - "선택된 옵션" 텍스트 존재
  - 테이블 헤더 "정책ID" 존재
- **검색/선택/태그/테이블 동기화**
  - 검색어 입력(예: "만료일") 후 leaf 라벨 클릭 → 선택 태그 생성 확인
  - 선택된 `policyId`만 테이블에 남는지 확인
- **태그 삭제(X) 동작**
  - 태그 `X` 클릭 시 선택 해제 및 테이블 데이터 전체 복원 확인
- **localStorage 복원**
  - 선택 후 언마운트/재렌더링 시 선택 태그가 복원되는지 확인

### 수동 테스트 케이스 정의

- **선택 상태 동기화**
  - leaf 체크/해제 시 하단 태그 및 테이블 데이터 동기화 확인
  - 그룹 체크/해제 시 하위 leaf 일괄 반영 확인
- **선택된 옵션 태그 동작**
  - leaf 체크 시 태그 1개 생성 및 라벨 표시 확인
  - 태그 `X` 클릭 시 해당 항목 체크 해제 및 테이블 데이터 동기화 확인
  - 그룹 전체 체크 시 `all(...)` 태그 생성 확인
  - `all(...)` 태그 `X` 클릭 시 하위 leaf 일괄 해제 및 테이블 데이터 동기화 확인
- **검색 동작**
  - 검색어 입력 시 트리 자동 open 상태 확인
  - 검색어 하이라이트 표시 확인
- **새로고침 상태 유지**
  - 필터 선택 후 새로고침 → 선택된 항목/선택 개수 유지 확인

## 6. 구현 과정에서의 고민 및 해결방법

- **초기 접근 방식의 한계**
  - 데이터(`testData`) 자체에 `isChecked`, `isOpen` 같은 UI 상태를 포함시키는 방식 시도
  - 검색 기능 추가 과정에서 “원본 데이터”와 “검색 결과 트리”가 분리되면서 상태 업데이트 경로가 복잡해지는 문제 발생
- **해결 방향**
  - UI 상태를 데이터에서 분리
    - open 상태: `openMap`
    - check 상태: `checkedMap`
  - 검색 결과는 `filteredTree`로 “표시용 트리”만 별도로 생성
  - 검색 중에는 매칭 경로를 openMap에 자동 반영하여 “검색되지만 접혀서 안 보이는” 문제 방지
- **새로고침 유지 요구사항 대응**
  - `src/App.js`에서 선택된 `policyId` 배열을 `localStorage`에 저장/복원 처리
  - `FilterView`는 `defaultCheckedIds`로 초기 체크 상태 주입 처리
