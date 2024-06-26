import DataLoader from "dataloader";
import { z, ZodObject } from "zod";

// Define the schemas
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
});

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  taskIds: z.array(z.string()),
  memberIds: z.array(z.string()),
});

type Task = z.infer<typeof TaskSchema>;
type User = z.infer<typeof UserSchema>;
type Project = z.infer<typeof ProjectSchema>;

type Config<T> = {
  loader: DataLoader<string, any>;
  relations: Record<
    string,
    { field: keyof T; loader: DataLoader<string, any> }
  >;
};

type LoadRelationsResult<T, R extends Record<string, any>> = T & {
  [K in keyof R]: R[K] extends {
    field: infer TK;
    loader: DataLoader<string, infer U>;
  }
    ? TK extends keyof T
      ? T[TK] extends any[]
        ? U[]
        : U | undefined
      : never
    : never;
};

// Simulate data storage
const tasks: Task[] = [
  { id: "1", name: "Task 1" },
  { id: "2", name: "Task 2" },
];

const users: User[] = [
  { id: "1", name: "User 1", age: 30 },
  { id: "2", name: "User 2", age: 25 },
];

const projects: Project[] = [
  {
    id: "1",
    name: "Project 1",
    ownerId: "1",
    taskIds: ["1"],
    memberIds: ["1", "2"],
  },
  {
    id: "2",
    name: "Project 2",
    ownerId: "2",
    taskIds: ["2"],
    memberIds: ["2"],
  },
];

// Define DataLoader functions

// Generic function to load relations
async function loadRelations<
  T extends ZodObject<any>,
  C extends Config<T["_input"]>
>(
  schema: T,
  id: string,
  config: C
): Promise<LoadRelationsResult<T["_input"], C["relations"]>> {
  const mainLoader = config.loader;

  const mainObject = await mainLoader.load(id);

  if (!mainObject) {
    throw new Error(`${schema._def.typeName} with ID ${id} not found`);
  }

  const promises = Object.entries(config.relations).map(
    async ([key, relationConfig]) => {
      const value = mainObject[relationConfig.field];
      const isArray = Array.isArray(value);
      const result = isArray
        ? await relationConfig.loader.loadMany(value)
        : await relationConfig.loader.load(value);
      return [key, result];
    }
  );

  const relations = await Promise.all(promises);
  return { ...mainObject, ...Object.fromEntries(relations) };
}

// Example usage
const projectsLoader = new DataLoader(async (ids) => {
  const taskLoader = new DataLoader<string, Task | undefined>(async (ids) => {
    return ids.map((id) => tasks.find((task) => task.id === id));
  });

  const userLoader = new DataLoader<string, User | undefined>(async (ids) => {
    return ids.map((id) => users.find((user) => user.id === id));
  });

  const projectLoader = new DataLoader<string, Project | undefined>(
    async (ids) => {
      return ids.map((id) => projects.find((project) => project.id === id));
    }
  );
  const results = await Promise.all(
    ids.map((id) =>
      loadRelations(ProjectSchema, id as string, {
        loader: projectLoader,
        relations: {
          owner: {
            field: "ownerId",
            loader: userLoader,
          },
          tasks: {
            field: "taskIds",
            loader: taskLoader,
          },
          members: {
            field: "memberIds",
            loader: userLoader,
          },
        },
      })
    )
  );

  return results;
});

projectsLoader.loadMany(["1", "2"]).then((items) => {
  console.log(items);
});
