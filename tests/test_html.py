import os
from pathlib import Path
from urllib.parse import urldefrag, urlparse

import pytest
from bs4 import BeautifulSoup

REPO_ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = list(REPO_ROOT.glob('*.html'))

@pytest.mark.parametrize('html_file', HTML_FILES)
def test_has_title_and_valid_links(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Each file should contain a <title> tag
    assert soup.find('title') is not None, f"{html_file} missing <title>"

    # Verify local links
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith('#'):
            continue
        parsed = urlparse(href)
        if parsed.scheme or parsed.netloc:
            # External link, skip
            continue
        local_path_str, _frag = urldefrag(href)
        # Resolve the path relative to the current HTML file
        local_path = (html_file.parent / local_path_str).resolve()
        # Ensure the resolved path stays within the repository
        try:
            local_path.relative_to(REPO_ROOT)
        except ValueError:
            pytest.fail(f"{html_file}: link escapes repository: {href}")
        assert local_path.exists(), f"{html_file}: broken link {href}"

