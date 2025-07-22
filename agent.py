import json
import asyncio
from typing import Dict, List, Any, TypedDict
from dataclasses import dataclass
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
import httpx
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import aiohttp
from urllib.parse import urljoin, urlparse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Web-Scraping Curriculum Designer API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# Pydantic models for FastAPI
class CurriculumRequest(BaseModel):
    subject: str
    topics: List[str]

class CurriculumResponse(BaseModel):
    curriculum: Dict[str, Any]

# State class for LangGraph
class CurriculumState(TypedDict):
    subject: str
    topics: List[str]
    course_outline: Dict[str, Any]
    detailed_content: Dict[str, Any]
    final_curriculum: Dict[str, Any]

@dataclass
class CurriculumAgent:
    groq_client: ChatGroq
    serper_api_key: str
    
    async def scrape_content(self, url: str) -> str:
        """Scrape and extract meaningful content from URL"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        return ""
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Remove script and style elements
                    for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
                        script.extract()
                    
                    # Extract main content
                    content_selectors = [
                        'main', 'article', '.content', '.post-content', 
                        '.entry-content', '.article-content', '#content',
                        '.tutorial-content', '.lesson-content'
                    ]
                    
                    content_text = ""
                    for selector in content_selectors:
                        content_div = soup.select_one(selector)
                        if content_div:
                            content_text = content_div.get_text(separator='\n', strip=True)
                            break
                    
                    if not content_text:
                        # Fallback to body content
                        content_text = soup.get_text(separator='\n', strip=True)
                    
                    # Clean and limit content
                    lines = [line.strip() for line in content_text.split('\n') if line.strip()]
                    # Take first 100 lines or 3000 characters, whichever is smaller
                    content_text = '\n'.join(lines[:100])
                    return content_text[:3000] if len(content_text) > 3000 else content_text
                    
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return ""

    async def search_content(self, query: str) -> List[Dict[str, str]]:
        """Search for educational content URLs using Serper API and return with titles"""
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": self.serper_api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "q": f"{query} tutorial learn course guide",
            "num": 10,
            "gl": "us",
            "hl": "en"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code != 200:
                    return []
                
                data = response.json()
                urls_data = []
                
                educational_domains = [
                    "coursera.org", "khanacademy.org", "edx.org", "youtube.com", 
                    "udemy.com", "mit.edu", "stanford.edu", "geeksforgeeks.org", 
                    "w3schools.com", "codecademy.com", "freecodecamp.org", 
                    "tutorialspoint.com", "brilliant.org", "udacity.com",
                    "medium.com", "towardsdatascience.com"
                ]
                
                for result in data.get("organic", []):
                    if len(urls_data) >= 3:  # Limit to 3 for scraping
                        break
                        
                    link = result.get("link")
                    title = result.get("title", "")
                    
                    if link and any(domain in link.lower() for domain in educational_domains):
                        urls_data.append({
                            "url": link,
                            "title": title,
                            "snippet": result.get("snippet", "")
                        })
                
                return urls_data
                
            except Exception as e:
                print(f"Serper API error: {e}")
                return []

    def clean_json_response(self, response_text: str) -> str:
        """Clean and extract JSON from LLM response"""
        response_text = re.sub(r'```json\n?', '', response_text)
        response_text = re.sub(r'```\n?', '', response_text)
        
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            return json_match.group(0)
        
        array_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if array_match:
            return array_match.group(0)
            
        return response_text.strip()

    def generate_course_outline(self, state: CurriculumState) -> CurriculumState:
        """Generate subtopics for each main topic"""
        
        prompt = f"""
        Create comprehensive subtopics for each main topic in {state['subject']}.
        Main topics: {', '.join(state['topics'])}
        
        For each main topic, generate 3-5 relevant subtopics that cover all important aspects.
        
        Return ONLY this JSON structure:
        {{
            "course_title": "Complete {state['subject']} Course",
            "overview": "Comprehensive course covering all aspects of {state['subject']} with detailed subtopics",
            "main_topics": [
                {{
                    "topic": "Topic 1 name",
                    "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4"]
                }},
                {{
                    "topic": "Topic 2 name", 
                    "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4", "Subtopic 5"]
                }}
            ]
        }}
        
        Make subtopics specific and comprehensive.
        """
        
        response = self.groq_client.invoke(prompt)
        cleaned_response = self.clean_json_response(response.content)
        
        try:
            course_outline = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            course_outline = {
                "course_title": f"Complete {state['subject']} Course",
                "overview": f"Comprehensive course covering all aspects of {state['subject']} with detailed coverage of each topic.",
                "main_topics": []
            }
            
            for topic in state['topics']:
                course_outline["main_topics"].append({
                    "topic": topic,
                    "subtopics": [
                        f"Introduction to {topic}",
                        f"Core Concepts of {topic}",
                        f"Practical Applications of {topic}",
                        f"Advanced {topic} Techniques"
                    ]
                })
        
        state['course_outline'] = course_outline
        return state

    def is_math_or_logical_subject(self, subject: str) -> bool:
        """Check if subject requires numerical/logical questions"""
        math_subjects = [
            "math", "mathematics", "algebra", "calculus", "geometry", "statistics", 
            "physics", "chemistry", "engineering", "computer science", "programming",
            "algorithms", "data structures", "machine learning", "artificial intelligence",
            "logic", "discrete mathematics", "linear algebra", "probability"
        ]
        return any(keyword in subject.lower() for keyword in math_subjects)

    async def generate_comprehensive_notes(self, subject: str, main_topic: str, subtopic: str, scraped_contents: List[str]) -> str:
        """Generate comprehensive notes with diagrams and equations from scraped content"""
        
        is_logical_subject = self.is_math_or_logical_subject(subject)
        
        combined_content = "\n\n---CONTENT SEPARATOR---\n\n".join(scraped_contents)
        
        if is_logical_subject:
            notes_prompt = f"""
            Create comprehensive study notes for '{subtopic}' under '{main_topic}' in {subject}.
            
            Source materials:
            {combined_content[:2000]}
            
            Generate detailed notes including:
            1. **Definition and Core Concepts**
            2. **Mathematical Formulas/Equations** (use LaTeX notation like $x^2 + y^2 = z^2$)
            3. **Step-by-step Examples** with calculations
            4. **Diagrams Description** (describe what diagrams would show)
            5. **Key Properties and Rules**
            6. **Common Applications**
            7. **Important Theorems/Principles**
            8. **Practice Problems** (2-3 with solutions)
            
            Use markdown formatting with headers, bullet points, and LaTeX for equations.
            Make it comprehensive and educational.
            """
        else:
            notes_prompt = f"""
            Create comprehensive study notes for '{subtopic}' under '{main_topic}' in {subject}.
            
            Source materials:
            {combined_content[:2000]}
            
            Generate detailed notes including:
            1. **Introduction and Overview**
            2. **Key Concepts and Definitions**
            3. **Detailed Explanations**
            4. **Diagrams and Visual Aids Description**
            5. **Real-world Examples**
            6. **Important Points to Remember**
            7. **Practical Applications**
            8. **Common Misconceptions**
            
            Use markdown formatting with headers, bullet points, and emphasis.
            Make it comprehensive and educational.
            """
        
        notes_response = self.groq_client.invoke(notes_prompt)
        return notes_response.content.strip()

    async def generate_detailed_content(self, state: CurriculumState) -> CurriculumState:
        """Generate detailed content for each subtopic with web scraping"""
        detailed_content = []
        is_logical_subject = self.is_math_or_logical_subject(state['subject'])
        
        for main_topic_data in state['course_outline']['main_topics']:
            main_topic = main_topic_data['topic']
            subtopics_content = []
            
            for subtopic in main_topic_data['subtopics']:
                print(f"Processing subtopic: {subtopic}")
                
                # Search for URLs and scrape content
                search_query = f"{state['subject']} {main_topic} {subtopic}"
                urls_data = await self.search_content(search_query)
                
                # Scrape content from URLs
                scraped_contents = []
                learning_urls = []
                
                for url_data in urls_data:
                    content = await self.scrape_content(url_data['url'])
                    if content:
                        scraped_contents.append(content)
                        learning_urls.append(url_data['url'])
                
                # Generate comprehensive notes from scraped content
                if scraped_contents:
                    comprehensive_notes = await self.generate_comprehensive_notes(
                        state['subject'], main_topic, subtopic, scraped_contents
                    )
                else:
                    # Fallback explanation if no content scraped
                    explanation_prompt = f"""
                    Write comprehensive study notes for '{subtopic}' under '{main_topic}' in {state['subject']}.
                    
                    Include:
                    - Detailed explanation (4-6 sentences)
                    - Key concepts and definitions
                    - Practical examples
                    - Important formulas (if applicable)
                    
                    Use markdown formatting.
                    """
                    
                    explanation_response = self.groq_client.invoke(explanation_prompt)
                    comprehensive_notes = explanation_response.content.strip()
                
                # Generate subtopic quiz (7-8 questions)
                if is_logical_subject:
                    quiz_prompt = f"""
                    Create 8 questions for '{subtopic}' in {state['subject']}.
                    Include numerical problems, logical reasoning, and practical applications.
                    
                    Based on this content: {comprehensive_notes[:1000]}
                    
                    Return ONLY this JSON array:
                    [
                        {{
                            "question": "Numerical or logical question with specific values/scenarios",
                            "options": ["Specific answer A", "Specific answer B", "Specific answer C", "Specific answer D"],
                            "correct_answer": 0,
                            "explanation": "Brief explanation with calculation steps"
                        }},
                        {{
                            "question": "Another question with actual numbers or formulas",
                            "options": ["Result 1", "Result 2", "Result 3", "Result 4"],
                            "correct_answer": 1,
                            "explanation": "Step-by-step solution"
                        }}
                    ]
                    
                    Generate 8 such questions with actual calculations and specific scenarios.
                    """
                else:
                    quiz_prompt = f"""
                    Create 8 comprehensive questions for '{subtopic}' in {state['subject']}.
                    
                    Based on this content: {comprehensive_notes[:1000]}
                    
                    Return ONLY this JSON array:
                    [
                        {{
                            "question": "Specific question testing understanding of {subtopic}",
                            "options": ["Detailed option A", "Detailed option B", "Detailed option C", "Detailed option D"],
                            "correct_answer": 0,
                            "explanation": "Why this answer is correct"
                        }}
                    ]
                    
                    Generate 8 questions based on the content provided.
                    """
                
                quiz_response = self.groq_client.invoke(quiz_prompt)
                cleaned_quiz = self.clean_json_response(quiz_response.content)
                
                try:
                    quiz = json.loads(cleaned_quiz)
                    if not isinstance(quiz, list):
                        raise ValueError("Quiz should be a list")
                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Quiz generation error for {subtopic}: {e}")
                    quiz = [
                        {
                            "question": f"What is the main concept behind {subtopic}?",
                            "options": ["Fundamental principle", "Practical application", "Theoretical framework", "All of the above"],
                            "correct_answer": 3,
                            "explanation": f"This covers the comprehensive understanding of {subtopic}"
                        }
                    ] * 8
                
                subtopic_content = {
                    "subtopic": subtopic,
                    "comprehensive_notes": comprehensive_notes,
                    "learning_urls": learning_urls,
                    "quiz": quiz[:8]
                }
                
                subtopics_content.append(subtopic_content)
            
            detailed_content.append({
                "main_topic": main_topic,
                "subtopics": subtopics_content
            })
        
        state['detailed_content'] = detailed_content
        return state

    async def generate_final_quiz(self, state: CurriculumState) -> CurriculumState:
        """Generate comprehensive final quiz (15-20 questions)"""
        all_subtopics = []
        all_notes = []
        
        for topic_data in state['detailed_content']:
            for subtopic_data in topic_data['subtopics']:
                all_subtopics.append({
                    'main_topic': topic_data['main_topic'],
                    'subtopic': subtopic_data['subtopic']
                })
                all_notes.append(subtopic_data['comprehensive_notes'][:500])
        
        combined_notes = "\n\n".join(all_notes[:10])  # Limit for prompt size
        is_logical_subject = self.is_math_or_logical_subject(state['subject'])
        
        if is_logical_subject:
            final_quiz_prompt = f"""
            Create a comprehensive final quiz of 18 questions for {state['subject']}.
            
            Based on course content:
            {combined_notes}
            
            Include:
            - Numerical problems with calculations (6 questions)
            - Logical reasoning questions (6 questions)  
            - Application-based scenarios (6 questions)
            
            Return ONLY this JSON array:
            [
                {{
                    "question": "Calculate: If x = 5 and y = 3, what is x² + y²?",
                    "options": ["28", "34", "25", "15"],
                    "correct_answer": 1,
                    "explanation": "x² + y² = 5² + 3² = 25 + 9 = 34",
                    "topic": "Related main topic",
                    "type": "numerical"
                }}
            ]
            
            Generate 18 such questions with real calculations and scenarios.
            """
        else:
            final_quiz_prompt = f"""
            Create a comprehensive final quiz of 18 questions for {state['subject']}.
            
            Based on course content:
            {combined_notes}
            
            Mix question types:
            - Conceptual understanding (6 questions)
            - Practical applications (6 questions)
            - Integration of topics (6 questions)
            
            Return ONLY this JSON array:
            [
                {{
                    "question": "Based on the course content, which statement best describes...",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": 0,
                    "explanation": "Detailed explanation based on course material",
                    "topic": "Related main topic",
                    "type": "conceptual"
                }}
            ]
            """
        
        quiz_response = self.groq_client.invoke(final_quiz_prompt)
        cleaned_quiz = self.clean_json_response(quiz_response.content)
        
        try:
            final_quiz = json.loads(cleaned_quiz)
            if not isinstance(final_quiz, list):
                raise ValueError("Final quiz should be a list")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Final quiz generation error: {e}")
            final_quiz = []
            for i, subtopic_data in enumerate(all_subtopics[:18]):
                final_quiz.append({
                    "question": f"Question {i+1}: What is the key principle of {subtopic_data['subtopic']}?",
                    "options": ["Principle A", "Principle B", "Principle C", "All principles"],
                    "correct_answer": 3,
                    "explanation": f"Comprehensive understanding of {subtopic_data['subtopic']}",
                    "topic": subtopic_data['main_topic'],
                    "type": "comprehensive"
                })
        
        # Combine everything into final curriculum
        final_curriculum = {
            "course_title": state['course_outline']['course_title'],
            "overview": state['course_outline']['overview'],
            "main_topics": state['detailed_content'],
            "final_quiz": final_quiz[:18],
            "total_subtopics": sum(len(topic['subtopics']) for topic in state['detailed_content']),
            "content_source": "Generated from web-scraped educational content"
        }
        
        state['final_curriculum'] = final_curriculum
        return state

# Create the LangGraph workflow
def create_curriculum_workflow(groq_client: ChatGroq, serper_api_key: str) -> StateGraph:
    agent = CurriculumAgent(groq_client, serper_api_key)
    
    workflow = StateGraph(CurriculumState)
    
    workflow.add_node("generate_outline", agent.generate_course_outline)
    workflow.add_node("generate_content", agent.generate_detailed_content)
    workflow.add_node("generate_final_quiz", agent.generate_final_quiz)
    
    workflow.add_edge("generate_outline", "generate_content")
    workflow.add_edge("generate_content", "generate_final_quiz")
    workflow.add_edge("generate_final_quiz", END)
    
    workflow.set_entry_point("generate_outline")
    
    return workflow.compile()

# FastAPI application
app = FastAPI(title="Web-Scraping Curriculum Designer API", version="3.0.0")

groq_client = ChatGroq(
    api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0.7,
    max_tokens=4000
)

curriculum_workflow = create_curriculum_workflow(groq_client, SERPER_API_KEY)

@app.post("/generate-curriculum", response_model=CurriculumResponse)
async def generate_curriculum(request: CurriculumRequest):
    """Generate curriculum with comprehensive notes from web-scraped content"""
    
    if not request.subject or not request.topics:
        raise HTTPException(status_code=400, detail="Subject and topics are required")
    
    if not GROQ_API_KEY or not SERPER_API_KEY:
        raise HTTPException(status_code=500, detail="API keys not configured")
    
    try:
        initial_state = CurriculumState(
            subject=request.subject,
            topics=request.topics,
            course_outline={},
            detailed_content=[],
            final_curriculum={}
        )
        
        result = await curriculum_workflow.ainvoke(initial_state)
        
        return CurriculumResponse(curriculum=result['final_curriculum'])
    
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating curriculum: {str(e)}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "groq_configured": bool(GROQ_API_KEY), 
        "serper_configured": bool(SERPER_API_KEY),
        "features": ["web_scraping", "content_generation", "comprehensive_notes"]
    }

@app.get("/")
async def root():
    return {
        "message": "Web-Scraping Curriculum Designer API",
        "version": "3.0.0",
        "features": [
            "Web content scraping from educational sources",
            "Comprehensive notes generation with diagrams/equations",
            "LaTeX equation support for math subjects",
            "7-8 questions per subtopic quiz",
            "15-18 questions final quiz",
            "Subject-aware content generation"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)