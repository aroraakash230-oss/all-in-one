/* =========================================
   SKILLBRIDGE AI
   CENTRAL INTELLIGENCE ENGINE
   ========================================= */


/* ---------- STUDENT DATA ---------- */

function getStudentData() {

    const profile =
        JSON.parse(
            localStorage.getItem("skillbridge_profile")
        ) || {};

    const career =
        JSON.parse(
            localStorage.getItem("skillbridge_career_explorer")
        ) || {};

    const skillScore =
        Number(
            localStorage.getItem("skillbridge_skill_score")
        ) || 0;

    const courses =
        Number(
            localStorage.getItem("skillbridge_courses_started")
        ) || 0;

    const projects =
        Number(
            localStorage.getItem("skillbridge_project_count")
        ) || 0;

    const learningXP =
        Number(
            localStorage.getItem("skillbridge_learning_xp")
        ) || 0;

    const projectXP =
        Number(
            localStorage.getItem("skillbridge_project_xp")
        ) || 0;


    return {

        profile,

        career,

        skillScore,

        courses,

        projects,

        learningXP,

        projectXP

    };
}



/* ---------- INTEREST SCORE ---------- */

function calculateInterestScore() {

    const student =
        getStudentData();

    let score = 0;


    if (
        student.career.domains &&
        student.career.domains.length > 0
    ) {

        score +=
            student.career.domains.length * 15;

    }


    if (student.career.region) {
        score += 10;
    }


    if (student.career.opportunityType) {
        score += 10;
    }


    score += student.courses * 5;

    score += student.projects * 5;


    return Math.min(score, 100);
}



/* ---------- LEARNING SCORE ---------- */

function calculateLearningScore() {

    const student =
        getStudentData();

    let score = 0;


    score += student.courses * 10;

    score += student.learningXP / 10;


    return Math.min(
        Math.round(score),
        100
    );
}



/* ---------- PROJECT SCORE ---------- */

function calculateProjectScore() {

    const student =
        getStudentData();

    let score =
        student.projects * 20;

    score +=
        student.projectXP / 10;


    return Math.min(
        Math.round(score),
        100
    );
}



/* ---------- CAREER AREAS ---------- */

function getCareerAreas() {

    const student =
        getStudentData();

    return student.career.domains || [];

}



/* ---------- OPPORTUNITY SCOPE ---------- */

function getOpportunityScope() {

    const student =
        getStudentData();

    return student.career.opportunityType ||
        student.career.region ||
        "National";

}



/* ---------- STUDENT READINESS ---------- */

function calculateReadiness() {

    const student =
        getStudentData();


    const interest =
        calculateInterestScore();

    const learning =
        calculateLearningScore();

    const projects =
        calculateProjectScore();

    const skills =
        student.skillScore;


    const readiness = Math.round(

        (
            interest +
            learning +
            projects +
            skills
        ) / 4

    );


    return Math.min(
        readiness,
        100
    );
}



/* ---------- SKILL GAP ---------- */

function calculateSkillGap() {

    const student =
        getStudentData();

    return Math.max(
        100 - student.skillScore,
        0
    );

}



/* ---------- AI CAREER MESSAGE ---------- */

function generateCareerInsight() {

    const student =
        getStudentData();

    const areas =
        getCareerAreas();


    if (areas.length === 0) {

        return (
            "Complete Interest Discovery to " +
            "generate your initial career insight."
        );

    }


    return (
        "Your current activity indicates interest " +
        "in " +
        areas.join(", ") +
        ". Focus on relevant skills, practical " +
        "projects and industry exposure."
    );

}



/* ---------- INDUSTRY MATCH ---------- */

function calculateIndustryMatch(requiredSkills) {

    const student =
        getStudentData();


    if (!requiredSkills ||
        requiredSkills.length === 0) {

        return 0;

    }


    /*
       Prototype matching:
       skill score is combined with
       project evidence.
    */

    const skillComponent =
        student.skillScore * 0.7;

    const projectComponent =
        Math.min(
            student.projects * 10,
            30
        );


    return Math.min(
        Math.round(
            skillComponent +
            projectComponent
        ),
        100
    );

}



/* ---------- INSTITUTE INSIGHT ---------- */

function generateInstituteInsight() {

    const student =
        getStudentData();


    if (!student.profile.branch) {

        return (
            "Student academic information " +
            "is required for institute analytics."
        );

    }


    return (
        "SkillBridge can use aggregated student " +
        "skill and learning data to identify " +
        "development areas for the institute."
    );

}



/* ---------- DATA SUMMARY ---------- */

function getSkillBridgeSummary() {

    return {

        interestScore:
            calculateInterestScore(),

        skillScore:
            getStudentData().skillScore,

        learningScore:
            calculateLearningScore(),

        projectScore:
            calculateProjectScore(),

        readiness:
            calculateReadiness(),

        skillGap:
            calculateSkillGap(),

        careerAreas:
            getCareerAreas(),

        opportunityScope:
            getOpportunityScope()

    };

}