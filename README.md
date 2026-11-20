# WorkflowKR 웹 배포

이 저장소는 WorkflowKR 웹 시안을 GitHub Pages에 올리기 위한 배포용 저장소입니다. 초기 웹 파일은 기존 저장소의 `website_demo/`에서 가져왔습니다.

- `web.html`과 `assets/`에서 배포할 웹 화면과 리소스를 관리합니다.
- `bash scripts/build-pages.sh`를 실행하면 배포할 파일이 새 임시 폴더에 생성됩니다. 스크립트가 출력한 폴더의 `index.html`을 열어 볼 수 있습니다.

## GitHub Pages 배포

1. 공개할 시안 내용을 확인하고 저장소를 공개로 전환합니다. [GitHub Pages 지원 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
2. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. **Actions → Deploy WorkflowKR website → Run workflow**에서 기본 브랜치를 선택해 실행합니다. 배포가 끝나면 실행 결과에서 사이트 주소를 확인할 수 있습니다.

배포 파일에는 `web.html`에서 만든 `index.html`과 `assets/`만 들어갑니다. 회원가입과 행사 신청은 시연용 화면입니다.
