{ pkgs, ... }: {
  # 시스템 채널 설정
  channel = "stable-24.05";

  # 필요한 패키지 설치
  packages = [
    pkgs.nodejs_20
  ];

  # IDX 구성 설정
  idx = {
    # 1. 확장 프로그램 설치 (이곳에 정의된 것만 동작함)
    extensions = [
      "esbenp.prettier-vscode"
    ];

    # 2. 프리뷰 기능 설정
    previews = {
      # 자동 웹 프리뷰 비활성화 (요구사항)
      enable = false; 
      
      previews = {
        web = {
          command = [
            "npm"
            "run"
            "dev"
            "--"
            "--port"
            "$PORT"
            "--hostname"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };

    # 3. 생명주기 훅을 이용한 설정 (에러를 피하는 논리적 대안)
    # Nix 빌드 에러를 방지하기 위해, 환경 생성 시점에 설정을 강제하거나 
    # 혹은 이 파일을 빌드한 후 .vscode/settings.json에서 관리하는 것이 표준입니다.

  };
}