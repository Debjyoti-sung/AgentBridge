import asyncio

from pydantic import BaseModel, Field
from browser_use import Agent, ChatOllama


# ============================================================
# 1. STRUCTURED OUTPUT
# ============================================================

class WebPageInfo(BaseModel):
    page_title: str = Field(
        description="The exact title of the webpage"
    )

    main_heading: str = Field(
        description="The main heading visible on the webpage"
    )

    links: list[str] = Field(
        description="URLs of links found on the webpage"
    )


# ============================================================
# 2. MAIN AGENT
# ============================================================

async def main():

    # --------------------------------------------------------
    # Ollama LLM
    # --------------------------------------------------------

    llm = ChatOllama(
        model="qwen2.5:1.5b",
        host="http://127.0.0.1:11434",
        ollama_options={
            "num_ctx": 32000
        },
    )

    # --------------------------------------------------------
    # Browser Use Agent
    # --------------------------------------------------------

    agent = Agent(
        task="""
        Open https://youtube.com.

        Read the webpage.

        Extract ONLY these three things:

        1. Page title
        2. Main heading
        3. All links

        Put the result into the required structured output.

        IMPORTANT:
        Once you have extracted these three values,
        immediately finish the task.

        Do NOT:
        - keep exploring the website
        - navigate to other pages
        - search for anything
        - repeat the extraction
        - perform unnecessary actions

        The task is complete as soon as the three fields
        are available.
        """,

        llm=llm,

        # Qwen2.5 1.5B is text-only
        use_vision=False,

        # Small model -> don't waste steps on reasoning
        use_thinking=False,

        # Hard limit: maximum 2 agent steps
        max_steps=2,

        # Only one browser action per step
        max_actions_per_step=1,

        # Return exactly this structure
        output_model_schema=WebPageInfo,
    )

    # --------------------------------------------------------
    # RUN
    # --------------------------------------------------------

    history = await agent.run(
        max_steps=2
    )

    # --------------------------------------------------------
    # GET FINAL STRUCTURED RESULT
    # --------------------------------------------------------

    result = history.structured_output

    # --------------------------------------------------------
    # CRISP OUTPUT
    # --------------------------------------------------------

    print("\n" + "=" * 45)
    print("             RESULT")
    print("=" * 45)

    if result:

        print(f"\nTitle   : {result.page_title}")
        print(f"Heading : {result.main_heading}")

        print("\nLinks   :")

        if result.links:
            for link in result.links:
                print(f"  {link}")
        else:
            print("  None")

    else:

        print("\nNo structured output was returned.")

    print("\n" + "=" * 45)


# ============================================================
# 3. START
# ============================================================

if __name__ == "__main__":
    asyncio.run(main())