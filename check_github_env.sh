# Check if GITHUB_TOKEN is already set and not empty
if [ -z "${GITHUB_TOKEN}" ]; then
  # Uncomment and add your GitHub token below
  # export GITHUB_TOKEN=your_github_token_here
  echo "GITHUB_TOKEN is not set. Please set it in the .env file."
fi

# Check if GITHUB_OWNER is already set and not empty
if [ -z "${GITHUB_OWNER}" ]; then
  # Uncomment and add your GitHub owner below
  # export GITHUB_OWNER=your_github_username_or_organization
  echo "GITHUB_OWNER is not set. Please set it in the .env file."
fi

# Check if GITHUB_REPO is already set and not empty
if [ -z "${GITHUB_REPO}" ]; then
  # Uncomment and add your GitHub repo below
  # export GITHUB_REPO=your_repository_name
  echo "GITHUB_REPO is not set. Please set it in the .env file."
fi

# Optional: Set a default branch if not already set
if [ -z "${GITHUB_BRANCH}" ]; then
  export GITHUB_BRANCH=main
fi
