import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OPTIONS } from "../utils/constants";
import { addRecommendedMovies } from "../utils/movieSlice";

const useRecommendedMovies = () => {
  const dispatch = useDispatch();
  const isFetching = useRef(false);
  const watchlist = useSelector((store) => store?.watchlist);
  const recommendedMovies = useSelector(
    (store) => store?.movies?.recommendedMovies,
  );

  const watchlistArray =
    watchlist?.map((media) => media?.original_title || media?.original_name) ??
    [];
  const watchlistString = watchlistArray.join(", ");

  const fetchMovies = async (movie) => {
    const data = await fetch(
      "https://api.themoviedb.org/3/search/movie?query=" +
        movie +
        "&include_adult=false&language=en-US&page=1",
      OPTIONS,
    );
    const json = await data.json();
    return json?.results;
  };

  const getGeminiRecommendations = async () => {
    if (recommendedMovies?.length > 0) return;
    if (isFetching.current) return;

    isFetching.current = true;
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.REACT_APP_GEMINI_API_KEY,
      );
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
      const prompt =
        "Act as a movie recommendation system. Analyze the following query string: '" +
        watchlistString +
        "', and provide a list of 15 comma-separated movie titles in a single string which are similar in genre to the given query movies. If the given query string is empty, provide any 15 movie of any genre. Do not add any heading text. Do not add release year. Just a single comma separated string.";

      const result = await model.generateContent(prompt);
      const geminiMediaList = result.response.text().split(", ");
      const promiseMovieList = geminiMediaList.map((media) =>
        fetchMovies(media),
      );
      const tmdbMovieResults = await Promise.all(promiseMovieList);
      const filteredTmdbMovies = tmdbMovieResults
        .map((subarray) => subarray?.[0])
        .filter(Boolean);

      dispatch(addRecommendedMovies(filteredTmdbMovies));
    } catch (error) {
      console.error(error);
    } finally {
      isFetching.current = false;
    }
  };

  return getGeminiRecommendations;
};

export default useRecommendedMovies;
