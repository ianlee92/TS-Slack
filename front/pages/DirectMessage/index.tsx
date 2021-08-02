import ChatBox from '@components/ChatBox';
import ChatList from '@components/ChatList';
import { Container, Header } from '@pages/Channel/styles';
import { IDM } from '@typings/db';
import fetcher from '@utils/fetcher';
import makeSection from '@utils/makeSection';
import React, { useCallback, useRef } from 'react';
import gravatar from 'gravatar';
import { useParams } from 'react-router';
import useSWR, { useSWRInfinite } from 'swr';
import useInput from '@hooks/useInput';
import axios from 'axios';
import Scrollbars from 'react-custom-scrollbars';

const DirectMessage = () => {
  const { workspace, id } = useParams<{ workspace: string; id: string }>();
  const { data: userData } = useSWR(`/api/workspaces/${workspace}/users/${id}`, fetcher);
  const { data: myData } = useSWR('/api/users', fetcher);
  const [chat, onChangeChat, setChat] = useInput('');
  //채팅 받아오는 API
  const {
    data: chatData,
    mutate: mutateChat,
    revalidate,
    setSize, // index는 페이지수, setSize는 페이지수를 바꿔줌
  } = useSWRInfinite<IDM[]>(
    (index) => `/api/workspaces/${workspace}/dms/${id}/chats?perPage=20&page=${index + 1}`,
    fetcher,
  );
  // isEmpty와 isReachingEnd라는 변수를 만들어서 인피니트스크롤링할때 사용
  // 데이터40개 20+20 가져오고 +0 isEmpty는 true isReachingEnd도 true
  // 데이터45개 20+20 가져오고 +5 isEmpty는 false isReachingEnd는 true
  const isEmpty = chatData?.[0]?.length === 0;
  const isReachingEnd = isEmpty || (chatData && chatData[chatData.length - 1]?.length < 20) || false; // 기본값 false
  const scrollbarRef = useRef<Scrollbars>(null);
  //채팅 보내는 API
  const onSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      console.log(chat);
      if (chat?.trim()) {
        axios
          .post(`/api/workspaces/${workspace}/dms/${id}/chats`, {
            content: chat,
          })
          .then(() => {
            revalidate(); // 바로 받아오게끔
            setChat(''); // 채팅 보내고 공백으로
          })
          .catch(console.error);
      }
    },
    [chat, chatData],
  );

  if (!userData || !myData) {
    return null;
  }

  const chatSections = makeSection(chatData ? chatData.flat().reverse() : []); // 2차원배열을 1차열배열로 바꿔주고 reverse

  return (
    <Container>
      <Header>
        <img src={gravatar.url(userData.email, { s: '24px', d: 'retro' })} alt={userData.nickname} />
      </Header>
      <ChatList
        chatSections={chatSections}
        ref={scrollbarRef}
        setSize={setSize}
        isEmpty={isEmpty}
        isReachingEnd={isReachingEnd}
      />
      <ChatBox chat={chat} onChangeChat={onChangeChat} onSubmitForm={onSubmitForm} />
    </Container>
  );
};

export default DirectMessage;
