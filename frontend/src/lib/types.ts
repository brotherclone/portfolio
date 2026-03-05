export type EntityId = string;
export type ProjectId = string;
export type SkillId = string;
export type ConceptId = string;
export type OrganizationId = string;
export type ArtifactId = string;
export type EraId = string;
export type DomainId = string;

export enum CategoryEnum {
    
    /** Design, UX, visual, motion */
    design = "design",
    /** Engineering, code, tooling */
    development = "development",
    /** Product strategy, research, leadership */
    strategy = "strategy",
    /** Owned creative output */
    artifact = "artifact",
};

export enum EngagementTypeEnum {
    
    /** Directly employed by the organization */
    direct = "direct",
    /** Employed by an agency, embedded full-time at client site */
    embedded = "embedded",
    /** Engaged on a project basis by the client through an agency */
    consulting = "consulting",
    /** Independent freelance engagement directly with client */
    freelance = "freelance",
};

export enum MediaTypeEnum {
    
    audio = "audio",
    video = "video",
    code = "code",
    writing = "writing",
    physical = "physical",
    image = "image",
    interactive = "interactive",
};


/**
 * Abstract base for all portfolio entities.
 */
export interface Entity {
    /** Canonical URI for this entity. */
    id: string,
    /** Human-readable name. */
    label: string,
    /** NDA-safe narrative — always shown regardless of confidential flag. Used by the agent for confidential projects. */
    summary: string,
    /** Full narrative detail — withheld from all API responses when gw:confidential is true on the parent entity. */
    detail?: string,
    /** When true, gw:detail is stripped from API responses. Node, edges, and summary remain visible. The graph topology is the evidence. */
    confidential?: boolean,
    /** Node size hint (0.0-1.0). Larger = deeper investment. */
    nodeWeight?: number,
    /** Hex colour or category token for graph rendering. */
    nodeColor?: string,
    /** Broad category for colour-coding in the graph. */
    category?: string,
}


/**
 * A discrete body of work. May be confidential — summary and relationships always visible, detail withheld when gw:confidential is true.
 */
export interface Project extends Entity {
    /** Year this entity / engagement began. */
    startYear?: number,
    /** Year this entity / engagement ended. 0 = present / ongoing. */
    endYear?: number,
    /** The employing organization. For agency work this is the agency (Threespot, Huge), not the client. */
    workedAt?: OrganizationId[],
    /** The client organization — who the work product was for. Absent for direct employment. */
    deliveredFor?: OrganizationId[],
    /** How the work was structured. direct = employed by this org. embedded = employed by agency, placed at client. consulting = project-based through agency. freelance = independent direct engagement. */
    engagementType?: string,
    /** Skills exercised on this project. */
    usedSkill?: SkillId[],
    /** Domain concepts engaged by this project. */
    involvedConcept?: ConceptId[],
    /** Showable artifacts that resulted from this project. */
    producedArtifact?: ArtifactId[],
    /** Career era(s) this project belongs to. */
    partOfEra?: EraId[],
    /** Industry/application domain(s). */
    inDomain?: DomainId[],
    /** Generic weak associative link between any two entities. */
    relatedTo?: string[],
    /** Academic institutions where teaching was conducted. */
    taughtAt?: OrganizationId[],
}


/**
 * A technical, design, or strategic capability. depthYears encodes how long the skill has been practised — drives node size in the graph.
 */
export interface Skill extends Entity {
    /** Years of practice for a Skill. Drives node size in the graph. */
    depthYears?: number,
    /** Public artifact that evidences this skill or concept claim. */
    evidencedBy?: ArtifactId[],
    /** Generic weak associative link between any two entities. */
    relatedTo?: string[],
}


/**
 * A domain concept or intellectual territory — the thematic layer of the graph. Concepts connect eras and skills through ledTo and informedBy edges.
 */
export interface Concept extends Entity {
    /** Causal or evolutionary relationship. */
    ledTo?: ConceptId[],
    /** Intellectual lineage. */
    informedBy?: ConceptId[],
    /** Public artifact that evidences this skill or concept claim. */
    evidencedBy?: ArtifactId[],
    /** Generic weak associative link between any two entities. */
    relatedTo?: string[],
}


/**
 * Employer, client, institution, or collaborator.
 */
export interface Organization extends Entity {
    /** Public URL for the entity. */
    url?: string,
    /** Geographic location (city, country). */
    location?: string,
    /** Industry/application domain(s). */
    inDomain?: DomainId[],
}


/**
 * Owned, showable work — music, animation, code, writing, physical. Primary evidence for creative and technical claims.
 */
export interface Artifact extends Entity {
    /** Public URL for the entity. */
    url?: string,
    /** Type of media for Artifact entities. */
    mediaType?: string,
    /** Generic weak associative link between any two entities. */
    relatedTo?: string[],
}


/**
 * A named temporal period that clusters related work into career chapters. Nodes in the graph, traversable via partOfEra edges.
 */
export interface Era extends Entity {
    /** Year this entity / engagement began. */
    startYear?: number,
    /** Year this entity / engagement ended. 0 = present / ongoing. */
    endYear?: number,
}


/**
 * Industry or application domain (enterprise, creative tech, education, etc.)
 */
export interface Domain extends Entity {
}



