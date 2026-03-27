from model_intel.sources.swebench import parse_swebench_leaderboards
from model_intel.sources.toolathlon import parse_toolathlon_leaderboard


def test_parse_swebench_leaderboards_keeps_board_and_model_tags() -> None:
    rows = parse_swebench_leaderboards(
        {
            "leaderboards": [
                {
                    "name": "bash-only",
                    "results": [
                        {
                            "name": "Claude Opus 4.6",
                            "resolved": 75.6,
                            "date": "2026-02-17",
                            "site": "https://www.anthropic.com/claude",
                            "tags": [
                                "Model: claude-opus-4-6",
                                "Org: Anthropic",
                            ],
                        }
                    ],
                }
            ]
        }
    )

    assert rows == [
        {
            "swebench_board": "bash-only",
            "swebench_model_name": "Claude Opus 4.6",
            "swebench_model_tag": "claude-opus-4-6",
            "provider": "anthropic",
            "normalized_name": "claude opus 4 6",
            "swebench_resolved": 75.6,
            "swebench_date": "2026-02-17",
            "swebench_model_url": "https://www.anthropic.com/claude",
            "swebench_leaderboard_url": "https://www.swebench.com/verified.html",
        }
    ]


def test_parse_toolathlon_leaderboard_extracts_rows_from_official_table() -> None:
    rows = parse_toolathlon_leaderboard(
        """
        <table class="performance-table">
          <tbody>
            <tr class="rank-other">
              <td class="model-name-cell" data-label="Model">
                <svg class="org-icon"><title>Claude</title></svg>
                Claude-4.6-Opus
                <span class="verified-badge" aria-hidden="true">✓</span>
              </td>
              <td>Proprietary</td>
              <td>Claude Agent SDK</td>
              <td>2026-03-06</td>
              <td>47.2†</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
        """
    )

    assert rows == [
        {
            "toolathlon_model_name": "Claude-4.6-Opus",
            "provider": "anthropic",
            "normalized_name": "claude 4 6 opus",
            "toolathlon_model_url": None,
            "toolathlon_leaderboard_url": "https://toolathlon.xyz/docs/leaderboard",
            "toolathlon_model_type": "Proprietary",
            "toolathlon_agent": "Claude Agent SDK",
            "toolathlon_date": "2026-03-06",
            "toolathlon_pass_at_1": 47.2,
            "toolathlon_pass_at_3": None,
            "toolathlon_pass_power_3": None,
            "toolathlon_turns": None,
            "toolathlon_verified": True,
        }
    ]
