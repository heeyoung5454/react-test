// AI로 작성된 테스트 코드 (npm test -- --watchAll=false)
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

// 기본 UI 렌더링 테스트
test("renders base UI", () => {
  render(<App />);

  expect(screen.getByRole("textbox")).toBeInTheDocument();
  expect(screen.getByText("선택된 옵션")).toBeInTheDocument();
  expect(screen.getByText("정책ID")).toBeInTheDocument();
});

// 검색 → 선택 → 태그 생성 → 테이블 필터링 전체 흐름 테스트
test("search -> leaf select -> tag creation -> table filtering", async () => {
  render(<App />);

  userEvent.type(screen.getByRole("textbox"), "만료일");

  const leafLabelText = "ACM 인증서 만료일 점검";
  userEvent.click(screen.getByLabelText(leafLabelText));

  expect(screen.getByText(/Identity & Crypto\s*>\s*Certificate Manager\s*>\s*ACM 인증서 만료일 점검/)).toBeInTheDocument();
  expect(screen.getByText("AWS-ACM-002")).toBeInTheDocument();
  expect(screen.queryByText("AWS-API-001")).not.toBeInTheDocument();
});

// 태그 X 클릭 → 선택 해제 → 테이블 전체 복원 테스트
test("tag X click -> selection cleared -> table reset", async () => {
  render(<App />);

  userEvent.type(screen.getByRole("textbox"), "만료일");
  userEvent.click(screen.getByLabelText("ACM 인증서 만료일 점검"));

  const tag = screen.getByText(/Identity & Crypto\s*>\s*Certificate Manager\s*>\s*ACM 인증서 만료일 점검/);
  const tagItem = tag.closest(".tag-item");
  expect(tagItem).not.toBeNull();

  userEvent.click(within(tagItem).getByText("×"));

  expect(screen.queryByText(/Identity & Crypto\s*>\s*Certificate Manager\s*>\s*ACM 인증서 만료일 점검/)).not.toBeInTheDocument();
  expect(screen.getByText("AWS-API-001")).toBeInTheDocument();
});

// 선택 후 언마운트/재렌더링 시 선택 태그가 복원되는지 테스트
test("localStorage restore after re-render", async () => {
  const { unmount } = render(<App />);

  userEvent.type(screen.getByRole("textbox"), "만료일");
  userEvent.click(screen.getByLabelText("ACM 인증서 만료일 점검"));

  unmount();
  render(<App />);

  expect(screen.getByText(/Identity & Crypto\s*>\s*Certificate Manager\s*>\s*ACM 인증서 만료일 점검/)).toBeInTheDocument();
});

// 깊은 하위 leaf 선택 시 상위 그룹의 indeterminate 전파 테스트
test("deep leaf selection propagates indeterminate to ancestors", async () => {
  render(<App />);

  userEvent.type(screen.getByRole("textbox"), "iam configuration");
  userEvent.click(screen.getByLabelText("액세스 키 90일 이내 교체"));

  const mainCheckbox = screen.getByLabelText(/Identity & Crypto/);
  const subCheckbox = screen.getByLabelText(/^IAM\s*\(/);
  const minorCheckbox = screen.getByLabelText(/IAM Configuration/);

  expect(mainCheckbox).toBePartiallyChecked();
  expect(subCheckbox).toBePartiallyChecked();
  expect(minorCheckbox).toBePartiallyChecked();
});
