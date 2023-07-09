import { Contest, User, UserSolution } from '../api/codeforces/interfaces';
import prisma from '../prisma';
import { fetchProblem } from '../problem/problem.services';
import { checkRecent } from '../utils';

export const createUser = async (user: User): Promise<User | null> => {
  try {
    await prisma.user.upsert({
      where: { handle: user.handle },
      create: {
        handle: user.handle,
        name: user.name,
        country: user.country,
        city: user.city,
        organization: user.organization,
        rating: user.rating,
        maxRating: user.maxRating,
        registrationTimeSeconds: user.registrationTimeSeconds,
        photoLink: user.photoLink,
      },
      update: {
        handle: user.handle,
        name: user.name,
        country: user.country,
        city: user.city,
        organization: user.organization,
        rating: user.rating,
        maxRating: user.maxRating,
        registrationTimeSeconds: user.registrationTimeSeconds,
        photoLink: user.photoLink,
        updatedAt: new Date(),
      },
    });

    await prisma.solution.deleteMany({
      where: { userHandle: user.handle },
    });

    await prisma.solution.createMany({
      data: Object.entries(user.solutions).map(([_, solution]) => ({
        problemContestId: solution.problem.contestId,
        problemIndex: solution.problem.index,
        submissionTime: solution.submissionTime,
        contestFlag: solution.contestFlag,
        userHandle: user.handle,
      })),
    });

    return await getUser(user.handle);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create user in the database.');
  }
};

export const getUser = async (handle: string): Promise<User | null> => {
  const dbUser = await prisma.user.findUnique({
    where: { handle },
    include: {
      solutions: true,
      contests: true,
    },
  });

  if (!dbUser) return null;
  if (!checkRecent(dbUser.updatedAt, 7200)) null;

  const mappedContests: Contest[] = dbUser.contests.map((contest) => {
    const { id, name, type, phase } = contest;
    const startTimeSeconds = contest.startTimeSeconds ?? undefined;
    return { id, name, startTime: startTimeSeconds, type, phase };
  });
  const mappedSolutions: UserSolution[] = [];

  for (const solution of dbUser.solutions) {
    const { submissionTime, contestFlag } = solution;
    const contestId = solution.problemContestId;
    const index = solution.problemIndex;

    const problem = await fetchProblem(contestId, index);
    if (!problem) continue;

    mappedSolutions.push({ problem, submissionTime, contestFlag });
  }

  return {
    ...dbUser,
    country: dbUser.country ?? undefined,
    city: dbUser.city ?? undefined,
    organization: dbUser.organization ?? undefined,
    solutions: mappedSolutions,
    contests: mappedContests,
  };
};

export const getUserMany = async (
  prismaFilter: object
): Promise<User[] | null> => {
  const dbUsers = await prisma.user.findMany({ where: prismaFilter });
  if (!dbUsers) return null;

  const result = await prisma.user.aggregate({
    where: prismaFilter,
    _min: { updatedAt: true },
  });
  const updatedAt = result._min.updatedAt;
  if (!updatedAt) return null;
  if (!checkRecent(updatedAt, 7200)) return null;

  const userPromises: Promise<User | null>[] = dbUsers.map((dbUser) =>
    getUser(dbUser.handle)
  );
  const users = await Promise.all(userPromises);

  return users.filter((user) => user !== null) as User[];
};
