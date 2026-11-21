# WorkflowKR 웹 배포

이 저장소는 WorkflowKR 웹 시안을 GitHub Pages에 올리기 위한 배포용 저장소입니다. 초기 웹 파일은 기존 저장소의 `website_demo/`에서 가져왔습니다.

- `web.html`과 `assets/`는 확정본 **v3**입니다. [기본 웹](https://workflowkr.github.io/)
- `experiments/v4/web.html`과 `experiments/v4/assets/`는 뉴스 카드를 실험하는 **v4 시안**입니다. [v4 미리보기](https://workflowkr.github.io/experiments/v4/)
- `bash scripts/build-pages.sh`는 확정본만 임시 폴더에 만듭니다. 실험본도 함께 확인하려면 `--with-experiments`를 붙입니다.

## GitHub Pages 배포

1. 공개할 시안 내용을 확인하고 저장소를 공개로 전환합니다. [GitHub Pages 지원 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
2. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. **Actions → Deploy WorkflowKR website → Run workflow**에서 기본 브랜치를 선택해 실행합니다. 배포가 끝나면 실행 결과에서 사이트 주소를 확인할 수 있습니다.

GitHub Pages 배포에서는 확정본을 기본 주소에, v4 시안을 `/experiments/v4/`에 올립니다. 회원가입과 행사 신청은 시연용 화면입니다.

## 바이오인포매틱스 새 소식

**Collect Bioinformatics News** 작업이 매일 오전 9시 17분(한국 시간)에 NCBI Insights, Nextflow·nf-core 릴리스, Europe PMC에서 제목·날짜·원문 주소를 수집합니다. Europe PMC에 응답 문제가 있으면 PubMed에서 논문 후보를 가져옵니다. **Actions**에서 직접 실행하거나 실행 결과의 `bio-news-candidates` 파일을 받아 확인할 수 있습니다.

뉴스 카드는 `experiments/v4/web.html`의 `bioNewsCovers`에서 편집합니다. 각 카드에 제목, 요약, 분석에 참고할 점, 원문 링크를 넣고 고유한 `data-news-id`를 지정합니다. 화면에서 카드를 좌우로 끌거나 이전·다음 버튼으로 넘길 수 있습니다. 카드 편집은 GitHub Pages 배포 작업으로 반영합니다. 표지 이미지는 각 소식의 주제를 표현한 일러스트입니다.

## AWS S3 및 CloudFront 배포

**현재 승인된 AWS 배포본은 `v3`입니다.** 뉴스 카드를 추가하기 전의 커밋 `930e116`에 `v3` 태그를 지정했습니다. Actions는 `main`에서 실행하며 S3에 올리는 웹 파일은 `refs/tags/v3`에서 가져옵니다.

AWS에서 준비한 사이트용 S3 버킷과 CloudFront 배포를 사용합니다. CloudFront의 기본 루트 객체는 `index.html`로 설정합니다. GitHub 저장소에서 **Settings → Secrets and variables → Actions → Variables**로 가서 다음 값을 등록합니다.

| 변수 | 값 |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | 이 저장소의 GitHub Actions가 맡을 AWS IAM 역할 ARN |
| `AWS_SITE_BUCKET` | 웹 파일을 올릴 S3 버킷 이름 |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | 웹 사이트용 CloudFront 배포 ID |
| `AWS_REGION` | S3 버킷 리전. 생략하면 `ap-northeast-2` |

AWS IAM에서 GitHub OIDC의 대상(`aud`)을 `sts.amazonaws.com`으로 설정하고, 이 저장소의 `aws-production` 배포 환경에 해당하는 주체(`sub`)만 허용합니다.

```text
repo:workflowkr@358994628/workflowkr.github.io@1464971765:environment:aws-production
```

IAM 역할에는 사이트 버킷 목록 조회, `index.html` 및 `assets/` 업로드, 지정 CloudFront 배포의 캐시 무효화 권한을 부여합니다. [GitHub Actions AWS OIDC 안내](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

**Actions → Deploy WorkflowKR website to AWS → Run workflow**에서 `main`으로 실행합니다. 실행을 시작하면 `aws-production` 승인자가 검토합니다. 기본값인 `check_only`는 승인 후 역할 인증과 S3 접근을 확인합니다. 실제 배포할 때는 `check_only` 선택을 해제합니다.
